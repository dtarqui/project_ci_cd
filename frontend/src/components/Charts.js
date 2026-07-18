import React from "react";
import PropTypes from "prop-types";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Colores de marca (reflejan las variables CSS de styles.css). Recharts
// necesita valores literales, no puede resolver var() en todos los casos.
const BRAND_PRIMARY = "#4F46E5";
const BRAND_ACCENT = "#0D9488";

// Paleta categórica validada (skill dataviz): orden fijo, nunca se cicla ni
// se reordena por rango. Los primeros 4-5 slots ya pasan CVD/contraste.
const CATEGORICAL = ["#2a78d6", "#008300", "#e87ba4", "#eda100", "#1baf7a"];

const AXIS_TICK = { fill: "var(--color-muted)", fontSize: 12 };
const GRID_STROKE = "var(--color-border)";

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
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis dataKey="product" angle={-45} textAnchor="end" height={80} tick={AXIS_TICK} />
        <YAxis
          tick={AXIS_TICK}
          label={{
            value: "Unidades vendidas",
            angle: -90,
            position: "insideLeft",
            fill: "var(--color-muted)",
          }}
        />
        <Tooltip />
        <Bar dataKey="quantity" name="Unidades" fill={BRAND_ACCENT} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </ChartCard>
);

const DailySalesChart = ({ data }) => (
  <ChartCard title="Ventas en día">
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis dataKey="day" tick={AXIS_TICK} />
        <YAxis
          tick={AXIS_TICK}
          label={{
            value: "Ventas",
            angle: -90,
            position: "insideLeft",
            fill: "var(--color-muted)",
          }}
        />
        <Tooltip />
        <Bar dataKey="sales" name="Ventas" fill={BRAND_PRIMARY} radius={[4, 4, 0, 0]} />
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
          cy="45%"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={4}
          dataKey="value"
        >
          {data?.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={CATEGORICAL[index % CATEGORICAL.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend verticalAlign="bottom" height={32} />
      </PieChart>
    </ResponsiveContainer>
  </ChartCard>
);

const CategoryChart = ({ data, fallbackData }) => {
  const chartData = data || fallbackData;

  return (
    <ChartCard title="Distribución por Categoría">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            outerRadius={90}
            dataKey="value"
            label={({ value }) => `${value}%`}
          >
            {(chartData || []).map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CATEGORICAL[index % CATEGORICAL.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" height={32} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

/**
 * Ventas (unidades) e ingresos (Bs) tienen escalas distintas — en vez de un
 * eje Y doble (confuso: dos escalas superpuestas en el mismo plano), se
 * muestran como dos mini-líneas de un solo eje cada una, lado a lado.
 */
const MonthlyTrendChart = ({ data, fallbackData }) => {
  const chartData = data || fallbackData;

  return (
    <ChartCard title="Tendencia de Ventas Mensuales" isWide={true}>
      <div className="chart-split">
        <div className="chart-split-item">
          <p className="chart-split-label">Unidades vendidas</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="month" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="sales"
                name="Unidades"
                stroke={BRAND_ACCENT}
                strokeWidth={2}
                dot={{ fill: BRAND_ACCENT, strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-split-item">
          <p className="chart-split-label">Ingresos (Bs.)</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="month" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Ingresos"
                stroke={BRAND_PRIMARY}
                strokeWidth={2}
                dot={{ fill: BRAND_PRIMARY, strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartCard>
  );
};

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
