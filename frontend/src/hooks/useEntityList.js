import { useState, useEffect, useCallback } from "react";

/**
 * Encapsula el patrón de carga de listas filtradas/ordenadas que se repetía
 * en ProductsSection y CustomersSection: arma query params a partir de
 * `filters`, llama a `fetchFn`, y recarga cuando cambian los filtros.
 * @param {(paramsString: string) => Promise<{data: Array}>} fetchFn
 * @param {Object<string, string>} filters - Valores actuales de los filtros
 *   (search, category/status, sort, etc.); solo se envían los que tengan valor.
 */
const useEntityList = (fetchFn, filters) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const filtersKey = JSON.stringify(filters);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetchFn(params.toString());
      setItems(response.data || []);
    } catch (err) {
      console.error("Error loading list:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
    // filtersKey representa el mismo contenido que `filters`, solo estable entre renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFn, filtersKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, setItems, loading, reload: load };
};

export default useEntityList;
