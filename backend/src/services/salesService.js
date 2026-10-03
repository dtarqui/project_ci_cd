/**
 * Sales Service
 * Lógica de negocio para construir una venta: calcula subtotal/impuesto/total,
 * reserva el stock de forma atómica y actualiza las estadísticas del cliente. No conoce `req`/`res`: en caso de fallo retorna un objeto
 * `{ error, code, status }` para que el controller lo traduzca con sendError.
 */

const { TAX_RATE } = require("../config/constants");

const buildSaleFromRequest = async (
  { customerId, items, discount = 0, paymentMethod, notes, status },
  { productRepository, customerRepository, saleRepository, user = null }
) => {
  const customer = await customerRepository.findById(customerId);

  if (!customer) {
    return {
      error: "Cliente no encontrado",
      code: "CUSTOMER_NOT_FOUND",
      status: 404,
    };
  }

  let subtotal = 0;
  const saleItems = [];
  const requestedByProduct = new Map();

  for (const item of items) {
    const requestedQty = requestedByProduct.get(item.productId) || 0;
    requestedByProduct.set(item.productId, requestedQty + item.quantity);
  }

  // Comprobacion previa: sirve para rechazar temprano y con el nombre del
  // producto a la vista. La garantia real esta en reserveStock, mas abajo; esta
  // lectura por si sola no impide que otra venta se lleve la misma unidad.
  for (const [productId, requestedQty] of requestedByProduct.entries()) {
    const product = await productRepository.findById(productId);

    if (!product) {
      return {
        error: "Producto no encontrado",
        code: "PRODUCT_NOT_FOUND",
        status: 404,
      };
    }

    if (requestedQty > product.stock) {
      return {
        error: `Stock insuficiente para ${product.name}`,
        code: "INSUFFICIENT_STOCK",
        status: 400,
        data: {
          productId: product.id,
          availableStock: product.stock,
          requestedQuantity: requestedQty,
        },
      };
    }
  }

  for (const item of items) {
    const product = await productRepository.findById(item.productId);

    if (!product) {
      return {
        error: "Producto no encontrado",
        code: "PRODUCT_NOT_FOUND",
        status: 404,
      };
    }

    const lineTotal = parseFloat((product.price * item.quantity).toFixed(2));
    subtotal += lineTotal;

    saleItems.push({
      productId: product.id,
      name: product.name,
      quantity: item.quantity,
      price: product.price,
      total: lineTotal,
    });
  }

  subtotal = parseFloat(subtotal.toFixed(2));
  const tax = parseFloat((subtotal * TAX_RATE).toFixed(2));

  // Un descuento mayor que el total se aceptaba y el total se recortaba a 0: la
  // venta quedaba registrada en Bs 0 pero el stock se descontaba igual, o sea
  // regalando la mercaderia sin que nada lo advirtiera. El formulario ya aplicaba
  // este tope; faltaba en la API, que es quien decide.
  const maxDiscount = parseFloat((subtotal + tax).toFixed(2));

  if (discount > maxDiscount) {
    return {
      error: "El descuento no puede superar el total de la venta",
      code: "INVALID_DISCOUNT",
      status: 400,
      data: { subtotal, tax, maxDiscount, requestedDiscount: discount },
    };
  }

  const total = parseFloat((subtotal + tax - discount).toFixed(2));

  const now = new Date().toISOString();
  const saleDate = now.split("T")[0];
  const finalStatus = status || "Completada";
  const esActiva = finalStatus.toLowerCase() !== "anulada";

  // El stock se reserva ANTES de registrar la venta, y cada linea en una sola
  // operacion. Antes se validaba con una lectura y se descontaba despues de
  // crear la venta: entre ambas cosas otra venta podia llevarse la misma unidad,
  // y si el descuento fallaba la venta ya estaba registrada.
  if (esActiva) {
    const reserva = await productRepository.reserveStock(saleItems, saleDate);

    if (!reserva.ok) {
      const producto = await productRepository.findById(reserva.productId);
      return {
        error: `Stock insuficiente para ${producto ? producto.name : "el producto"}`,
        code: "INSUFFICIENT_STOCK",
        status: 400,
        data: {
          productId: reserva.productId,
          availableStock: reserva.availableStock,
          requestedQuantity: reserva.requestedQuantity,
        },
      };
    }
  }

  let newSale;
  try {
    newSale = await saleRepository.create({
      customerId: customer.id,
      customerName: customer.name,
      userId: user?.id ?? null,
      userName: user?.name || user?.username || null,
      items: saleItems,
      subtotal,
      tax,
      discount,
      total: total < 0 ? 0 : total,
      status: finalStatus,
      paymentMethod,
      notes: notes || "",
    });
  } catch (error) {
    // La venta no se registro: se devuelve el stock ya reservado.
    if (esActiva) {
      await productRepository.releaseStock(saleItems);
    }
    throw error;
  }

  // El inventario ya se desconto al reservar; aqui solo quedan las metricas.
  if (esActiva) {
    await customerRepository.updateStats(customer.id, {
      totalSpentDelta: newSale.total,
      purchasesDelta: 1,
      lastPurchase: saleDate,
    });
  }

  return { sale: newSale, timestamp: now };
};

/**
 * Anula una venta y deshace lo que su registro hizo.
 *
 * Antes anular solo cambiaba el estado: el stock descontado no volvia nunca y el
 * cliente seguia contando una compra que ya no existia, asi que el inventario
 * quedaba corto y sus estadisticas no cuadraban con el panel, que si descarta
 * las ventas anuladas.
 */
const cancelSaleById = async (
  saleId,
  { productRepository, customerRepository, saleRepository }
) => {
  const sale = await saleRepository.findById(saleId);

  if (!sale) {
    return { error: "Venta no encontrada", code: "SALE_NOT_FOUND", status: 404 };
  }

  // El cambio de estado es condicional: si otra peticion anulo la misma venta
  // primero, aqui se obtiene null y no se devuelve el stock por segunda vez.
  const canceledSale = await saleRepository.cancel(saleId);

  if (!canceledSale) {
    return {
      error: "La venta ya estaba anulada",
      code: "SALE_ALREADY_CANCELED",
      status: 409,
    };
  }

  await productRepository.releaseStock(canceledSale.items || []);

  await customerRepository.updateStats(canceledSale.customerId, {
    totalSpentDelta: -canceledSale.total,
    purchasesDelta: -1,
  });

  return { sale: canceledSale };
};

module.exports = { buildSaleFromRequest, cancelSaleById };
