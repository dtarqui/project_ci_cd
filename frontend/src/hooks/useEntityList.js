import { useState, useEffect, useCallback } from "react";

/**
 * Encapsula el patrón de carga de listas filtradas/ordenadas que se repetía
 * en ProductsSection y CustomersSection: arma query params a partir de
 * `filters`, llama a `fetchFn`, y recarga cuando cambian los filtros.
 * @param {(paramsString: string) => Promise<{data: Array}>} fetchFn
 * @param {Object<string, string|number>} filters - Valores actuales de los
 *   filtros (search, category/status, sort, page, pageSize, etc.); solo se
 *   envían los que tengan valor. Si el caller incluye `page`, el backend
 *   pagina y la respuesta trae `page`/`pageSize`/`totalPages`/`count`, que
 *   quedan expuestos en `meta`. Sin `page`, `meta` queda en `null`.
 */
const useEntityList = (fetchFn, filters) => {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const filtersKey = JSON.stringify(filters);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetchFn(params.toString());
      setItems(response.data || []);
      setMeta(
        response.page !== undefined
          ? {
              page: response.page,
              pageSize: response.pageSize,
              total: response.count ?? (response.data || []).length,
              totalPages: response.totalPages,
            }
          : null
      );
    } catch (err) {
      console.error("Error loading list:", err);
      setItems([]);
      setMeta(null);
      setError(err);
    } finally {
      setLoading(false);
    }
    // filtersKey representa el mismo contenido que `filters`, solo estable entre renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFn, filtersKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, setItems, loading, error, reload: load, meta };
};

export default useEntityList;
