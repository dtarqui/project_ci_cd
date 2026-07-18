/**
 * Formato de moneda compartido (Bolivianos). Antes duplicado: SalesSection
 * ya lo tenía bien con Intl; ProductsSection/CustomersSection/SalesSummary
 * usaban un "$" concatenado a mano.
 */
export const formatCurrency = (value) =>
  new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: 2,
  }).format(value || 0);

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-BO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};
