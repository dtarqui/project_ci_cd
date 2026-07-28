import { renderHook, waitFor, act } from "@testing-library/react";
import useEntityList from "../hooks/useEntityList";

describe("useEntityList", () => {
  it("debe iniciar en estado de carga y luego exponer los items", async () => {
    const fetchFn = jest.fn().mockResolvedValue({ data: [{ id: 1 }, { id: 2 }] });

    const { result } = renderHook(() => useEntityList(fetchFn, {}));

    expect(result.current.loading).toBe(true);
    expect(result.current.items).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toEqual([{ id: 1 }, { id: 2 }]);
    expect(result.current.error).toBeNull();
  });

  it("debe construir los query params solo con filtros con valor", async () => {
    const fetchFn = jest.fn().mockResolvedValue({ data: [] });

    renderHook(() =>
      useEntityList(fetchFn, { search: "laptop", category: "", sort: "name" })
    );

    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledWith("search=laptop&sort=name");
    });
  });

  it("debe volver a cargar cuando cambian los filtros", async () => {
    const fetchFn = jest.fn().mockResolvedValue({ data: [] });

    const { rerender } = renderHook(
      ({ filters }) => useEntityList(fetchFn, filters),
      { initialProps: { filters: { search: "a" } } }
    );

    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    rerender({ filters: { search: "b" } });

    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });
    expect(fetchFn).toHaveBeenLastCalledWith("search=b");
  });

  it("debe exponer setItems para actualizar la lista localmente", async () => {
    const fetchFn = jest.fn().mockResolvedValue({ data: [{ id: 1 }] });

    const { result } = renderHook(() => useEntityList(fetchFn, {}));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setItems([{ id: 1 }, { id: 2 }]);
    });

    expect(result.current.items).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("debe manejar el camino de error: vacía items y expone el error", async () => {
    const apiError = new Error("Network down");
    const fetchFn = jest.fn().mockRejectedValue(apiError);
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useEntityList(fetchFn, {}));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.error).toBe(apiError);

    consoleSpy.mockRestore();
  });

  it("debe volver a cargar manualmente al invocar reload", async () => {
    const fetchFn = jest.fn().mockResolvedValue({ data: [{ id: 1 }] });

    const { result } = renderHook(() => useEntityList(fetchFn, {}));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.reload();
    });

    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("debe usar arreglo vacío cuando la respuesta no trae data", async () => {
    const fetchFn = jest.fn().mockResolvedValue({});

    const { result } = renderHook(() => useEntityList(fetchFn, {}));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toEqual([]);
  });
});
