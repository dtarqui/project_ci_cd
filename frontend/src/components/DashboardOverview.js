import React from "react";
import PropTypes from "prop-types";
import {
  ProductSalesChart,
  DailySalesChart,
  BranchSalesChart,
  CategoryChart,
  MonthlyTrendChart,
  TopProductsChart,
} from "./Charts";

const DashboardOverview = ({ data }) => (
  <div className="dashboard-overview">
    <div className="charts-grid">
      <ProductSalesChart data={data?.productSales} />
      <DailySalesChart data={data?.salesTrend} />
      <BranchSalesChart data={data?.branchSales} />
      <CategoryChart
        data={data?.categoryDistribution}
        fallbackData={data?.branchSales}
      />
      <MonthlyTrendChart
        data={data?.monthlySales}
        fallbackData={data?.salesTrend}
      />
      <TopProductsChart data={data?.topProducts} />
    </div>
  </div>
);

DashboardOverview.propTypes = {
  data: PropTypes.shape({
    dailySales: PropTypes.string,
    totalOrders: PropTypes.number,
    activeCustomers: PropTypes.number,
    averageTicket: PropTypes.string,
    productSales: PropTypes.array,
    salesTrend: PropTypes.array,
    branchSales: PropTypes.array,
    categoryDistribution: PropTypes.array,
    monthlySales: PropTypes.array,
    topProducts: PropTypes.array,
  }),
};

export default DashboardOverview;
