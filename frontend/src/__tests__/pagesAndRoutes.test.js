import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import {
  ROUTES,
  NAVIGATION_ITEMS,
} from "../config/routes.config";
import {
  DashboardPage,
  ProductsPage,
  CustomersPage,
  SalesPage,
  NotFoundPage,
} from "../pages";

describe("Pages and Routes Configuration", () => {
  test("should expose expected route constants", () => {
    expect(ROUTES.LOGIN).toBe("/login");
    expect(ROUTES.DASHBOARD).toBe("/dashboard");
    expect(ROUTES.PRODUCTS).toContain("products");
    expect(ROUTES.CUSTOMERS).toContain("customers");
    expect(ROUTES.SALES).toContain("sales");
    expect(ROUTES.NOT_FOUND).toBe("/404");
    expect(ROUTES.UNAUTHORIZED).toBe("/401");
  });

  test("should expose navigation items mapped to routes", () => {
    expect(Array.isArray(NAVIGATION_ITEMS)).toBe(true);
    expect(NAVIGATION_ITEMS).toHaveLength(4);

    NAVIGATION_ITEMS.forEach((item) => {
      expect(item).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          label: expect.any(String),
          path: expect.any(String),
          icon: expect.any(String),
        })
      );
    });
  });

  test("should render DashboardPage", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  test("should render ProductsPage", () => {
    render(<ProductsPage />);
    expect(screen.getByText("Products")).toBeInTheDocument();
  });

  test("should render CustomersPage", () => {
    render(<CustomersPage />);
    expect(screen.getByText("Customers")).toBeInTheDocument();
  });

  test("should render SalesPage", () => {
    render(<SalesPage />);
    expect(screen.getByText("Sales")).toBeInTheDocument();
  });

  test("should render NotFoundPage and navigate on button click", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/unknown"]}>
        <Routes>
          <Route path="/unknown" element={<NotFoundPage />} />
          <Route path="/dashboard" element={<div>Dashboard Destination</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("Page Not Found")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back to dashboard/i }));

    expect(screen.getByText("Dashboard Destination")).toBeInTheDocument();
  });
});
