"use client";

import { useMemo, useState } from "react";

import { companies, displayDate, money } from "../lib/constants";
import type { Expense } from "../lib/db";

type SortKey = "company_code" | "product_name" | "expense_date" | "qty" | "commission" | "amount" | "party_name";

export default function ExpenseTable({ expenses }: { expenses: Expense[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("expense_date");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const sorted = useMemo(() => {
    return [...expenses].sort((left, right) => {
      const leftAmount = left.qty * left.commission;
      const rightAmount = right.qty * right.commission;
      const leftValue = sortKey === "amount" ? leftAmount : left[sortKey];
      const rightValue = sortKey === "amount" ? rightAmount : right[sortKey];
      if (leftValue < rightValue) return direction === "asc" ? -1 : 1;
      if (leftValue > rightValue) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [direction, expenses, sortKey]);

  function toggle(key: SortKey) {
    if (sortKey === key) {
      setDirection(direction === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(key);
    setDirection("asc");
  }

  function header(label: string, key: SortKey, className = "") {
    const marker = sortKey === key ? (direction === "asc" ? " ↑" : " ↓") : "";
    return (
      <th className={className}>
        <button type="button" className="sort-button" onClick={() => toggle(key)}>
          {label}
          {marker}
        </button>
      </th>
    );
  }

  async function removeExpense(id: number) {
    if (!window.confirm("Delete this expense?")) return;

    setDeletingId(id);
    const response = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (response.ok) {
      window.location.reload();
      return;
    }
    setDeletingId(null);
    window.alert("Could not delete expense.");
  }

  if (!expenses.length) {
    return (
      <table>
        <tbody>
          <tr>
            <td className="empty">No expenses yet. Add expenses above, then select them for a report.</td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Pick</th>
          <th>#</th>
          {header("Company", "company_code")}
          {header("Product", "product_name")}
          {header("Date", "expense_date")}
          {header("Qty", "qty", "num")}
          {header("Commission", "commission", "num")}
          {header("Amount", "amount", "num")}
          {header("Party", "party_name")}
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((expense, index) => (
          <tr key={expense.id}>
            <td>
              <input type="checkbox" name="expense_id" value={expense.id} form="export-report-form" />
            </td>
            <td>{index + 1}</td>
            <td>
              <select className="table-input" name="company" form={`edit-expense-${expense.id}`} defaultValue={expense.company_code}>
                {Object.keys(companies).map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <input className="table-input" name="productName" form={`edit-expense-${expense.id}`} defaultValue={expense.product_name} required />
            </td>
            <td>
              <input className="table-input" type="date" name="expenseDate" form={`edit-expense-${expense.id}`} defaultValue={expense.expense_date} required />
            </td>
            <td className="num">
              <input className="table-input" name="qty" form={`edit-expense-${expense.id}`} defaultValue={expense.qty} inputMode="decimal" required />
            </td>
            <td className="num">
              <input
                className="table-input"
                name="commission"
                form={`edit-expense-${expense.id}`}
                defaultValue={expense.commission}
                inputMode="decimal"
                required
              />
            </td>
            <td className="num">{money(expense.qty * expense.commission)}</td>
            <td>
              <input className="table-input" name="partyName" form={`edit-expense-${expense.id}`} defaultValue={expense.party_name} required />
            </td>
            <td>
              <form id={`edit-expense-${expense.id}`} method="post" action={`/api/expenses/${expense.id}`} />
              <div className="actions">
                <button className="small-button" type="submit" form={`edit-expense-${expense.id}`}>
                  Save
                </button>
                <button className="small-button danger-button" type="button" disabled={deletingId === expense.id} onClick={() => removeExpense(expense.id)}>
                  {deletingId === expense.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
