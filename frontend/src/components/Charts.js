import React from "react";
import PropTypes from "prop-types";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

const ChartCard = ({ title, children, isWide = false }) => (
  <div className={`chart-card ${isWide ? "chart-wide" : ""}`}>
    <h4>{title}</h4>
    {children}
  </div>
);

ChartCard.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  isWide: PropTypes.bool,
};

const ProductSalesChart = ({ data }) => (
  <ChartCard title="Productos vendidos">
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="product" angle={-45} textAnchor="end" height={80} />
        <YAxis
          label={{
            value: "Productos vendidos",
            angle: -90,
            position: "insideLeft",
          }}
        />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="quantity"
          stroke="#8884d8"
          strokeWidth={2}
          dot={{ fill: "#8884d8", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  </ChartCard>
);

const DailySalesChart = ({ data }) => (
  <ChartCard title="Ventas en día">
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="day" />
        <YAxis
          label={{
            value: "Y Axis Label",
            angle: -90,
            position: "insideLeft",
          }}
        />
        <Tooltip />
        <Bar dataKey="sales" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  </ChartCard>
);

const BranchSalesChart = ({ data }) => (
  <ChartCard title="Ventas por sucursal">
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={5}
          dataKey="value"
        >
          {data?.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  </ChartCard>
);

const CategoryChart = ({ data, fallbackData }) => (
  <ChartCard title="Distribución por Categoría">
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data || fallbackData}
          cx="50%"
          cy="50%"
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
          label={({ name, value }) => `${name}: ${value}%`}
        >
          {(data || fallbackData || []).map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  </ChartCard>
);

const MonthlyTrendChart = ({ data, fallbackData }) => (
  <ChartCard title="Tendencia de Ventas Mensuales" isWide={true}>
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data || fallbackData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis
          yAxisId="left"
          label={{
            value: "Ventas",
            angle: -90,
            position: "insideLeft",
          }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          label={{
            value: "Revenue (K)",
            angle: 90,
            position: "insideRight",
          }}
        />
        <Tooltip />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="sales"
          stroke="#8884d8"
          strokeWidth={3}
          dot={{ fill: "#8884d8", strokeWidth: 2, r: 5 }}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="revenue"
          stroke="#82ca9d"
          strokeWidth={3}
          dot={{ fill: "#82ca9d", strokeWidth: 2, r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  </ChartCard>
);

const TopProductsChart = ({ data }) => (
  <ChartCard title="Top 5 Productos">
    <div className="top-products-list">
      {(data || []).map((product, idx) => (
        <div key={idx} className="product-item">
          <div className="product-rank">#{idx + 1}</div>
          <div className="product-info">
            <div className="product-name">{product.name}</div>
            <div className="product-stats">
              <span>{product.sales} ventas</span>
              <span className="product-revenue">
                ${(product.revenue / 1000).toFixed(1)}K
              </span>
              <span
                className={`product-trend ${
                  product.trend.includes("+") ? "positive" : "negative"
                }`}
              >
                {product.trend}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </ChartCard>
);

ProductSalesChart.propTypes = {
  data: PropTypes.array,
};

DailySalesChart.propTypes = {
  data: PropTypes.array,
};

BranchSalesChart.propTypes = {
  data: PropTypes.array,
};

CategoryChart.propTypes = {
  data: PropTypes.array,
  fallbackData: PropTypes.array,
};

MonthlyTrendChart.propTypes = {
  data: PropTypes.array,
  fallbackData: PropTypes.array,
};

TopProductsChart.propTypes = {
  data: PropTypes.array,
};

export {
  ProductSalesChart,
  DailySalesChart,
  BranchSalesChart,
  CategoryChart,
  MonthlyTrendChart,
  TopProductsChart,
};
