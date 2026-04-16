import Sale from "../models/Sale.model.js";
import Invoice from "../models/Invoice.model.js";
import Payment from "../models/Payment.model.js";
import Customer from "../models/Customer.model.js";
import Supplier from "../models/Supplier.model.js";
import Product from "../models/Product.model.js";
import Expense from "../models/Expense.model.js";
import { requireCompany } from "./company.service.js";

export const dashboardOverview = async () => {
  const company = await requireCompany();
  const currency = company.currency;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalSalesAgg,
    outstandingAgg,
    lowStock,
    customerCount,
    supplierCount,
    recentSales,
    recentPayments,
    expensesMonth,
    topProducts,
  ] = await Promise.all([
    Sale.aggregate([
      { $match: { status: "completed", createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Invoice.aggregate([
      {
        $match: {
          status: { $in: ["sent", "partially_paid", "overdue"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$balance" } } },
    ]),
    Product.countDocuments({
      status: "active",
      $expr: { $lte: ["$stockOnHand", "$reorderLevel"] },
    }),
    Customer.countDocuments({ deletedAt: { $exists: false }, status: "active" }),
    Supplier.countDocuments({ deletedAt: { $exists: false }, status: "active" }),
    Sale.find({ status: "completed" })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("saleNumber total createdAt customerId walkInCustomerName")
      .lean(),
    Payment.find({ status: "completed" })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("paymentNumber amount method createdAt")
      .lean(),
    Expense.aggregate([
      { $match: { status: { $in: ["approved", "paid"] } } },
      {
        $addFields: {
          dashboardDate: {
            $ifNull: [
              "$paidAt",
              { $ifNull: ["$approvedAt", { $ifNull: ["$expenseDate", "$createdAt"] }] },
            ],
          },
        },
      },
      { $match: { dashboardDate: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Sale.aggregate([
      { $match: { status: "completed" } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          qty: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.lineTotal" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
    ]),
  ]);

  return {
    currency,
    monthlySalesTotal: totalSalesAgg[0]?.total ?? 0,
    outstandingInvoices: outstandingAgg[0]?.total ?? 0,
    lowStockCount: lowStock,
    customerCount,
    supplierCount,
    recentSales,
    recentPayments,
    expensesThisMonth: expensesMonth[0]?.total ?? 0,
    topProductsByRevenue: topProducts.map((p) => ({
      productId: p._id,
      quantity: p.qty,
      revenue: p.revenue,
    })),
  };
};
