import React from "react";
import PropTypes from "prop-types";

const SalesSummary = ({ data }) => {
  const cards = [
    {
      value: data?.dailySales,
      label: "Ventas diarias",
      isMain: true,
    },
    {
      value: data?.totalOrders?.toLocaleString() || "N/A",
      label: "Órdenes Totales",
    },
    {
      value: data?.activeCustomers?.toLocaleString() || "N/A",
      label: "Clientes Activos",
    },
    {
      value: `$${data?.averageTicket || "0.00"}`,
      label: "Ticket Promedio",
    },
  ];

  return (
    <div className="sales-summary">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`summary-card ${card.isMain ? "main-metric" : ""}`}
        >
          <h3>{card.value}</h3>
          <p>{card.label}</p>
        </div>
      ))}
    </div>
  );
};

SalesSummary.propTypes = {
  data: PropTypes.shape({
    dailySales: PropTypes.string,
    totalOrders: PropTypes.number,
    activeCustomers: PropTypes.number,
    averageTicket: PropTypes.string,
  }),
};

export default SalesSummary;
