/**
 * Security Alert Repository
 * Conserva las alertas de seguridad: en memoria o en la tabla security_alerts.
 */

const { getMockData } = require("../db/dataStore");
const { getPrismaClient } = require("../db/prismaClient");
const { createRepository } = require("./factory");

const MAX_IN_MEMORY = 500;

const memoryAlerts = () => {
  const data = getMockData();
  if (!data.securityAlerts) {
    data.securityAlerts = [];
  }
  return data.securityAlerts;
};

class InMemorySecurityAlertRepository {
  async create(alert) {
    const alerts = memoryAlerts();
    const created = {
      id: alerts.length > 0 ? alerts[alerts.length - 1].id + 1 : 1,
      ...alert,
      createdAt: new Date().toISOString(),
    };
    alerts.push(created);
    if (alerts.length > MAX_IN_MEMORY) {
      alerts.shift();
    }
    return created;
  }

  async listRecent(limit) {
    return [...memoryAlerts()].reverse().slice(0, limit);
  }
}

class DatabaseSecurityAlertRepository {
  async create(alert) {
    return getPrismaClient().securityAlert.create({
      data: {
        type: alert.type,
        severity: alert.severity,
        userId: alert.userId ?? null,
        username: alert.username ?? null,
        ip: alert.ip ?? null,
        details: alert.details ?? undefined,
      },
    });
  }

  async listRecent(limit) {
    return getPrismaClient().securityAlert.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
    });
  }
}

const createSecurityAlertRepository = () =>
  createRepository(InMemorySecurityAlertRepository, DatabaseSecurityAlertRepository);

module.exports = {
  InMemorySecurityAlertRepository,
  DatabaseSecurityAlertRepository,
  createSecurityAlertRepository,
};
