import React from "react";
import PropTypes from "prop-types";
import { MdPayments, MdShoppingCart, MdPeopleAlt, MdReceipt } from "react-icons/md";
import { formatCurrency } from "../utils/format";

const SalesSummary = ({ data }) => {
  const cards = [
    {
      value: data?.dailySales,
      label: "Ventas diarias",
      icon: <MdPayments />,
      isMain: true,
    },
    {
      value: data?.totalOrders?.toLocaleString() || "N/A",
      label: "Órdenes Totales",
      icon: <MdShoppingCart />,
    },
    {
      value: data?.activeCustomers?.toLocaleString() || "N/A",
      label: "Clientes Activos",
      icon: <MdPeopleAlt />,
    },
    {
      value: data?.averageTicket ? formatCurrency(Number(data.averageTicket)) : "N/A",
      label: "Ticket Promedio",
      icon: <MdReceipt />,
    },
  ];

  return (
    <div className="sales-summary">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`summary-card ${card.isMain ? "main-metric" : ""}`}
        >
          <span className="summary-card-icon">{card.icon}</span>
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
