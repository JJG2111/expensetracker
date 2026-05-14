"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { companies, money, users } from "../lib/constants";
import type { Expense } from "../lib/db";

type SortKey = "company_code" | "product_name" | "expense_date" | "qty" | "commission" | "amount" | "party_name";

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addYears(date: Date, years: number) {
  const nextDate = new Date(date);
  nextDate.setFullYear(nextDate.getFullYear() + years);
  return nextDate;
}

function SuggestInput({
  field,
  name,
  className,
  defaultValue = "",
  form,
  placeholder,
  required
}: {
  field: "product" | "party";
  name: string;
  className: string;
  defaultValue?: string;
  form?: string;
  placeholder?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(defaultValue);

  useEffect(() => {
    const query = value.trim();
    if (!query || query.toLowerCase() === selectedSuggestion.trim().toLowerCase()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      const params = new URLSearchParams({ field, q: query });
      const response = await fetch(`/api/suggestions?${params.toString()}`, { signal: controller.signal });
      if (!response.ok) return;

      const payload = (await response.json()) as { suggestions?: string[] };
      setSuggestions(payload.suggestions ?? []);
      setOpen(true);
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [field, selectedSuggestion, value]);

  return (
    <div className="suggest-input">
      <input
        className={className}
        name={name}
        form={form}
        value={value}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          setValue(event.target.value);
          setSelectedSuggestion("");
        }}
        onFocus={() => suggestions.length && setOpen(true)}
      />
      {open && suggestions.length > 0 && (
        <div className="suggest-menu">
          {suggestions.map((suggestion) => (
            <button
              className="suggest-item"
              key={suggestion}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setValue(suggestion);
                setSelectedSuggestion(suggestion);
                setSuggestions([]);
                setOpen(false);
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ExpenseTable({ expenses }: { expenses: Expense[] }) {
  const today = new Date();
  const defaultStartDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const [rows, setRows] = useState(expenses);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [sortKey, setSortKey] = useState<SortKey>("expense_date");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const visibleRows = useMemo(() => rows.filter((expense) => expense.expense_date >= startDate), [rows, startDate]);
  const visibleIds = useMemo(() => new Set(visibleRows.map((expense) => expense.id)), [visibleRows]);

  const sorted = useMemo(() => {
    return [...visibleRows].sort((left, right) => {
      const leftAmount = left.qty * left.commission;
      const rightAmount = right.qty * right.commission;
      const leftValue = sortKey === "amount" ? leftAmount : left[sortKey];
      const rightValue = sortKey === "amount" ? rightAmount : right[sortKey];
      if (leftValue < rightValue) return direction === "asc" ? -1 : 1;
      if (leftValue > rightValue) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [direction, sortKey, visibleRows]);

  const allSortedSelected = sorted.length > 0 && sorted.every((expense) => selectedIds.includes(expense.id));

  useEffect(() => {
    setSelectedIds((currentIds) => currentIds.filter((id) => visibleIds.has(id)));
  }, [visibleIds]);
  const totals = useMemo(() => {
    const today = new Date();
    const todayKey = dateKey(today);
    const thisMonthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    const ytdStart = `${today.getFullYear()}-01-01`;
    const lookbackStart = dateKey(addYears(today, -1));

    return rows.reduce(
      (summary, expense) => {
        const amount = expense.qty * expense.commission;
        const expenseDate = expense.expense_date;

        summary.total += amount;
        if (expenseDate >= thisMonthStart && expenseDate <= todayKey) summary.thisMonth += amount;
        if (expenseDate >= ytdStart && expenseDate <= todayKey) summary.ytd += amount;
        if (expenseDate >= lookbackStart && expenseDate <= todayKey) summary.oneYearLookback += amount;

        return summary;
      },
      { total: 0, thisMonth: 0, ytd: 0, oneYearLookback: 0 }
    );
  }, [rows]);

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
    if (!window.confirm("Delete this earning?")) return;

    setDeletingId(id);
    const response = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (response.ok) {
      setRows((currentRows) => currentRows.filter((expense) => expense.id !== id));
      setSelectedIds((currentIds) => currentIds.filter((selectedId) => selectedId !== id));
      setDeletingId(null);
      return;
    }
    setDeletingId(null);
    window.alert("Could not delete earning.");
  }

  async function saveExpense(id: number, formId: string) {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement) || !form.reportValidity()) return;

    setSavingId(id);
    const response = await fetch(`/api/expenses/${id}`, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new FormData(form)
    });

    if (response.ok) {
      const payload = (await response.json()) as { expense?: Expense };
      if (payload.expense) {
        setRows((currentRows) => currentRows.map((expense) => (expense.id === id ? payload.expense! : expense)));
      }
      setSavingId(null);
      return;
    }

    setSavingId(null);
    window.alert("Could not save earning.");
  }

  async function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    setAdding(true);
    const response = await fetch("/api/expenses", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new FormData(form)
    });

    if (response.ok) {
      const payload = (await response.json()) as { expense?: Expense };
      if (payload.expense) {
        setRows((currentRows) => [...currentRows, payload.expense!]);
      }
      form.reset();
      setShowAddModal(false);
      setAdding(false);
      return;
    }

    setAdding(false);
    window.alert("Could not add earning.");
  }

  function toggleSelection(id: number) {
    setSelectedIds((currentIds) => (currentIds.includes(id) ? currentIds.filter((selectedId) => selectedId !== id) : [...currentIds, id]));
  }

  function toggleAllSorted() {
    if (allSortedSelected) {
      setSelectedIds((currentIds) => currentIds.filter((id) => !sorted.some((expense) => expense.id === id)));
      return;
    }

    setSelectedIds((currentIds) => Array.from(new Set([...currentIds, ...sorted.map((expense) => expense.id)])));
  }

  return (
    <>
      <div className="summary">
        <h2 className="h4 fw-bold mb-0">All Earnings</h2>
      </div>
      <section className="metric-grid">
        <div className="metric p-3">
          <span className="text-secondary">Total</span>
          <strong>{money(totals.total)}</strong>
        </div>
        <div className="metric p-3">
          <span className="text-secondary">This Month</span>
          <strong>{money(totals.thisMonth)}</strong>
        </div>
        <div className="metric p-3">
          <span className="text-secondary">YTD</span>
          <strong>{money(totals.ytd)}</strong>
        </div>
        <div className="metric p-3">
          <span className="text-secondary">1 Year Lookback</span>
          <strong>{money(totals.oneYearLookback)}</strong>
        </div>
      </section>

      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="expense_id" value={id} form="export-report-form" />
      ))}
      <div className="card p-3 mb-3">
        <div className="d-flex flex-column flex-md-row gap-2 align-items-md-center justify-content-between">
          <div>
            <strong>{selectedIds.length} selected</strong>
            <div className="text-secondary small">Use the checkboxes to choose earnings for the report.</div>
          </div>
          <div className="d-flex flex-column flex-sm-row flex-wrap gap-2 justify-content-md-end align-items-sm-end">
            <div>
              <label className="form-label fw-semibold small mb-1">Show From</label>
              <input className="form-control form-control-sm" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </div>
            <button className="btn btn-primary btn-sm" type="button" onClick={() => setShowAddModal(true)}>
              Add Earning
            </button>
            <button className="btn btn-success btn-sm" type="button" onClick={() => setShowExportModal(true)} disabled={!selectedIds.length}>
              Export Report
            </button>
            <button className="btn btn-outline-primary btn-sm" type="button" onClick={toggleAllSorted}>
              {allSortedSelected ? "Unselect visible" : "Select visible"}
            </button>
            <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => setSelectedIds([])} disabled={!selectedIds.length}>
              Clear
            </button>
          </div>
        </div>
      </div>

      {visibleRows.length ? (
        <>
          <div className="mobile-expense-list">
            {sorted.map((expense) => (
          <article className={`card p-3 ${selectedIds.includes(expense.id) ? "border-primary" : ""}`} key={expense.id}>
            <div className="expense-card-top">
              <label className="pick-pill">
                <input type="checkbox" checked={selectedIds.includes(expense.id)} onChange={() => toggleSelection(expense.id)} />
                Pick
              </label>
              <strong>{money(expense.qty * expense.commission)}</strong>
            </div>
            <form id={`mobile-edit-expense-${expense.id}`} method="post" action={`/api/expenses/${expense.id}`} />
            <div className="mobile-form-grid">
              <div>
                <label className="form-label fw-semibold">Company</label>
                <select className="form-select" name="company" form={`mobile-edit-expense-${expense.id}`} defaultValue={expense.company_code}>
                  {Object.keys(companies).map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label fw-semibold">Date</label>
                <input className="form-control" type="date" name="expenseDate" form={`mobile-edit-expense-${expense.id}`} defaultValue={expense.expense_date} required />
              </div>
              <div className="field-full">
                <label className="form-label fw-semibold">Product</label>
                <input className="form-control" name="productName" form={`mobile-edit-expense-${expense.id}`} defaultValue={expense.product_name} required />
              </div>
              <div>
                <label className="form-label fw-semibold">Qty</label>
                <input className="form-control" name="qty" form={`mobile-edit-expense-${expense.id}`} defaultValue={expense.qty} inputMode="decimal" required />
              </div>
              <div>
                <label className="form-label fw-semibold">Commission</label>
                <input className="form-control" name="commission" form={`mobile-edit-expense-${expense.id}`} defaultValue={expense.commission} inputMode="decimal" required />
              </div>
              <div className="field-full">
                <label className="form-label fw-semibold">Party</label>
                <input className="form-control" name="partyName" form={`mobile-edit-expense-${expense.id}`} defaultValue={expense.party_name} required />
              </div>
            </div>
            <div className="d-flex gap-2 mt-3">
              <button className="btn btn-primary btn-sm flex-fill" type="button" disabled={savingId === expense.id} onClick={() => saveExpense(expense.id, `mobile-edit-expense-${expense.id}`)}>
                {savingId === expense.id ? "Saving..." : "Save"}
              </button>
              <button className="btn btn-danger btn-sm flex-fill" type="button" disabled={deletingId === expense.id} onClick={() => removeExpense(expense.id)}>
                {deletingId === expense.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </article>
            ))}
          </div>

          <div className="table-wrap table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>
                <input className="form-check-input" type="checkbox" checked={allSortedSelected} onChange={toggleAllSorted} aria-label="Select all visible earnings" />
              </th>
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
              <tr key={expense.id} className={selectedIds.includes(expense.id) ? "table-primary" : ""}>
                <td>
                  <input className="form-check-input" type="checkbox" checked={selectedIds.includes(expense.id)} onChange={() => toggleSelection(expense.id)} aria-label={`Select earning ${index + 1}`} />
                </td>
                <td>{index + 1}</td>
                <td>
                  <select className="form-select form-select-sm table-input" name="company" form={`edit-expense-${expense.id}`} defaultValue={expense.company_code}>
                    {Object.keys(companies).map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input className="form-control form-control-sm table-input" name="productName" form={`edit-expense-${expense.id}`} defaultValue={expense.product_name} required />
                </td>
                <td>
                  <input className="form-control form-control-sm table-input" type="date" name="expenseDate" form={`edit-expense-${expense.id}`} defaultValue={expense.expense_date} required />
                </td>
                <td className="num">
                  <input className="form-control form-control-sm table-input" name="qty" form={`edit-expense-${expense.id}`} defaultValue={expense.qty} inputMode="decimal" required />
                </td>
                <td className="num">
                  <input
                    className="form-control form-control-sm table-input"
                    name="commission"
                    form={`edit-expense-${expense.id}`}
                    defaultValue={expense.commission}
                    inputMode="decimal"
                    required
                  />
                </td>
                <td className="num">{money(expense.qty * expense.commission)}</td>
                <td>
                  <input className="form-control form-control-sm table-input" name="partyName" form={`edit-expense-${expense.id}`} defaultValue={expense.party_name} required />
                </td>
                <td>
                  <form id={`edit-expense-${expense.id}`} method="post" action={`/api/expenses/${expense.id}`} />
                  <div className="d-flex gap-2">
                    <button className="btn btn-primary btn-sm" type="button" disabled={savingId === expense.id} onClick={() => saveExpense(expense.id, `edit-expense-${expense.id}`)}>
                      {savingId === expense.id ? "Saving..." : "Save"}
                    </button>
                    <button className="btn btn-danger btn-sm" type="button" disabled={deletingId === expense.id} onClick={() => removeExpense(expense.id)}>
                      {deletingId === expense.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
          </div>
        </>
      ) : (
        <div className="alert alert-secondary rounded-4">
          No earnings found from {startDate}. Change the start date or use Add Earning to create a new row.
        </div>
      )}

      {showAddModal && (
        <>
          <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content rounded-4 border-0">
                <div className="modal-header">
                  <h2 className="modal-title h5 fw-bold">Add Earning</h2>
                  <button className="btn-close" type="button" aria-label="Close" onClick={() => setShowAddModal(false)} />
                </div>
                <form id="add-expense-form" onSubmit={addExpense}>
                  <div className="modal-body">
                    <div className="row g-3">
                      <div className="col-12 col-md-4">
                        <label className="form-label fw-semibold">Company</label>
                        <select className="form-select" name="company" required>
                          {Object.entries(companies).map(([code, company]) => (
                            <option key={code} value={code}>
                              {code} - {company.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12 col-md-4">
                        <label className="form-label fw-semibold">Product</label>
                        <SuggestInput className="form-control" field="product" name="productName" placeholder="e.g. Golden Orange" required />
                      </div>
                      <div className="col-12 col-md-4">
                        <label className="form-label fw-semibold">Date</label>
                        <input className="form-control" type="date" name="expenseDate" required />
                      </div>
                      <div className="col-6">
                        <label className="form-label fw-semibold">Qty</label>
                        <input className="form-control" name="qty" inputMode="decimal" placeholder="0" required />
                      </div>
                      <div className="col-6">
                        <label className="form-label fw-semibold">Commission</label>
                        <input className="form-control" name="commission" inputMode="decimal" placeholder="0" required />
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-semibold">Party</label>
                        <SuggestInput className="form-control" field="party" name="partyName" placeholder="Customer / party name" required />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button className="btn btn-outline-secondary" type="button" onClick={() => setShowAddModal(false)}>
                      Cancel
                    </button>
                    <button className="btn btn-primary" type="submit" disabled={adding}>
                      {adding ? "Adding..." : "Add Earning"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop show" />
        </>
      )}

      {showExportModal && (
        <>
          <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content rounded-4 border-0">
                <div className="modal-header">
                  <div>
                    <h2 className="modal-title h5 fw-bold">Export Report</h2>
                    <div className="text-secondary small">{selectedIds.length} earnings selected</div>
                  </div>
                  <button className="btn-close" type="button" aria-label="Close" onClick={() => setShowExportModal(false)} />
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold">Report User</label>
                      <select className="form-select" name="user" form="export-report-form" required>
                        {Object.entries(users).map(([code, user]) => (
                          <option key={code} value={code}>
                            {code} - {user.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold">Report Date</label>
                      <input className="form-control" type="date" name="reportDate" form="export-report-form" required />
                    </div>
                    <div className="col-12 col-md-8">
                      <label className="form-label fw-semibold">Report Company</label>
                      <select className="form-select" name="company" form="export-report-form" required>
                        {Object.entries(companies).map(([code, company]) => (
                          <option key={code} value={code}>
                            {code} - {company.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label fw-semibold">Format</label>
                      <select className="form-select" name="format" form="export-report-form">
                        <option value="pdf">PDF (.pdf)</option>
                        <option value="xlsx">Excel (.xlsx)</option>
                        <option value="csv">CSV (.csv)</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline-secondary" type="button" onClick={() => setShowExportModal(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-success" type="submit" form="export-report-form">
                    Export Report
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop show" />
        </>
      )}
    </>
  );
}
