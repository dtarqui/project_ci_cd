/**
 * User DAO
 * Encapsula transformaciones entre payloads y entidad usuario.
 */

const UserDao = {
  normalizeRegistration(payload = {}) {
    const normalizeText = (value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    };

    const normalizedEmail = normalizeText(payload.email);

    return {
      username: normalizeText(payload.username),
      email: normalizedEmail ? normalizedEmail.toLowerCase() : normalizedEmail,
      password: payload.password,
      name: normalizeText(payload.name),
      phone: normalizeText(payload.phone),
      address: normalizeText(payload.address),
      city: normalizeText(payload.city),
      state: normalizeText(payload.state),
      country: normalizeText(payload.country),
      postalCode: normalizeText(payload.postalCode),
      dateOfBirth: normalizeText(payload.dateOfBirth),
    };
  },
};

module.exports = { UserDao };
