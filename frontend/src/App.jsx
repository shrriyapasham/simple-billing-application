import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

// Support both proxy (/api) and direct backend URL (http://localhost:8080/api)
const API_BASE = import.meta.env.VITE_API_URL || '/api'
const money = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value || 0))

const formatDate = (isoString) => {
  if (!isoString) return '—'
  const date = new Date(isoString)
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function App() {
  const [activeTab, setActiveTab] = useState('create') // 'create' | 'history'
  const [products, setProducts] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [rows, setRows] = useState([{ productId: '', quantity: '1' }])
  const [previewBill, setPreviewBill] = useState(null)
  const [activeInvoice, setActiveInvoice] = useState(null) // for modal / print view
  const [invoices, setInvoices] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fetchingInvoices, setFetchingInvoices] = useState(false)

  // Load products on mount
  useEffect(() => {
    fetchProducts()
    fetchInvoices()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${API_BASE}/products`)
      setProducts(res.data)
      setError('')
    } catch (err) {
      // Fallback directly to localhost:8080 if proxy isn't used
      try {
        const directRes = await axios.get('http://localhost:8080/api/products')
        setProducts(directRes.data)
        setError('')
      } catch {
        setError('Could not load products. Please make sure the Spring Boot backend is running on port 8080.')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchInvoices = async (search = '') => {
    try {
      setFetchingInvoices(true)
      const url = search ? `${API_BASE}/invoices?search=${encodeURIComponent(search)}` : `${API_BASE}/invoices`
      const res = await axios.get(url)
      setInvoices(res.data)
    } catch {
      try {
        const fallbackUrl = search
          ? `http://localhost:8080/api/invoices?search=${encodeURIComponent(search)}`
          : 'http://localhost:8080/api/invoices'
        const directRes = await axios.get(fallbackUrl)
        setInvoices(directRes.data)
      } catch (err) {
        console.error('Failed to fetch invoices:', err)
      }
    } finally {
      setFetchingInvoices(false)
    }
  }

  // Handle Search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Calculation helpers for real-time draft preview
  const selectedLines = useMemo(() => {
    return rows
      .filter((r) => r.productId !== '')
      .map((r) => {
        const product = products.find((p) => String(p.id) === String(r.productId))
        const quantity = Number(r.quantity)
        const isValidQty = Number.isInteger(quantity) && quantity > 0
        const total = product && isValidQty ? Number(product.price) * quantity : 0
        return { ...r, product, quantity, total }
      })
  }, [rows, products])

  const subtotal = selectedLines.reduce((sum, line) => sum + line.total, 0)
  const discountPercent = subtotal > 1000 ? 10 : 0
  const discountAmount = subtotal > 1000 ? subtotal * 0.1 : 0
  const finalAmount = subtotal - discountAmount

  // Row operations
  const updateRow = (index, field, value) => {
    setRows((old) => old.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
    setPreviewBill(null)
    setError('')
    setSuccessMsg('')
  }

  const addRow = () => {
    setRows((old) => [...old, { productId: '', quantity: '1' }])
    setPreviewBill(null)
  }

  const removeRow = (index) => {
    if (rows.length > 1) {
      setRows((old) => old.filter((_, i) => i !== index))
      setPreviewBill(null)
    }
  }

  // Validation
  const validateForm = () => {
    setError('')
    setSuccessMsg('')
    if (!customerName.trim()) {
      setError('Please enter the customer name.')
      return false
    }
    if (!rows.length || rows.some((r) => !r.productId)) {
      setError('Please choose a valid product for every row.')
      return false
    }
    if (rows.some((r) => !/^[1-9]\d*$/.test(String(r.quantity)))) {
      setError('Every quantity must be a positive whole number (at least 1).')
      return false
    }
    return true
  }

  // Preview / Validate endpoint
  const handleValidatePreview = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      setSaving(true)
      const payload = {
        customerName: customerName.trim(),
        items: rows.map((r) => ({ productId: Number(r.productId), quantity: Number(r.quantity) })),
      }
      let res
      try {
        res = await axios.post(`${API_BASE}/bills/validate`, payload)
      } catch {
        res = await axios.post('http://localhost:8080/api/bills/validate', payload)
      }
      setPreviewBill(res.data)
      setSuccessMsg('Bill calculated successfully. Review below or click "Save & Generate Invoice".')
    } catch (err) {
      setError(err.response?.data?.message || 'Calculation failed. Please verify your backend server.')
    } finally {
      setSaving(false)
    }
  }

  // Save Invoice Permanently
  const handleSaveInvoice = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      setSaving(true)
      const payload = {
        customerName: customerName.trim(),
        items: rows.map((r) => ({ productId: Number(r.productId), quantity: Number(r.quantity) })),
      }
      let res
      try {
        res = await axios.post(`${API_BASE}/invoices`, payload)
      } catch {
        res = await axios.post('http://localhost:8080/api/invoices', payload)
      }
      const savedInvoice = res.data
      setActiveInvoice(savedInvoice)
      setPreviewBill(null)
      setSuccessMsg(`Invoice ${savedInvoice.invoiceNumber} created and saved successfully!`)
      fetchInvoices() // Refresh history
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save invoice to database.')
    } finally {
      setSaving(false)
    }
  }

  // Reset Form
  const resetForm = () => {
    setCustomerName('')
    setRows([{ productId: '', quantity: '1' }])
    setPreviewBill(null)
    setActiveInvoice(null)
    setError('')
    setSuccessMsg('')
  }

  // Download Invoice as Clean Text / HTML Receipt
  const downloadReceipt = (inv) => {
    const content = `=====================================================
               SIMPLE BILLING INVOICE
=====================================================
Invoice Number: ${inv.invoiceNumber}
Date & Time:    ${formatDate(inv.createdAt)}
Customer Name:  ${inv.customerName}
-----------------------------------------------------
ITEMS:
${inv.items
  .map(
    (item, idx) =>
      `${idx + 1}. ${item.productName.padEnd(20)} x ${String(item.quantity).padStart(3)} @ ${money(
        item.price
      ).padStart(10)} = ${money(item.total).padStart(12)}`
  )
  .join('\n')}
-----------------------------------------------------
Subtotal:       ${money(inv.subtotal).padStart(35)}
Discount (${inv.discountPercent}%):  -${money(inv.discountAmount).padStart(34)}
-----------------------------------------------------
FINAL AMOUNT:   ${money(inv.finalAmount).padStart(35)}
=====================================================
            Thank you for your business!
=====================================================
`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${inv.invoiceNumber}.txt`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  // Dashboard Stats
  const totalRevenue = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + Number(inv.finalAmount || 0), 0)
  }, [invoices])

  const totalDiscount = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + Number(inv.discountAmount || 0), 0)
  }, [invoices])

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="navbar no-print">
        <div className="nav-brand">
          <div className="brand-badge">₹</div>
          <div>
            <h1 className="brand-title">BillingPro</h1>
            <p className="brand-subtitle">Smart Billing & Invoice Management</p>
          </div>
        </div>

        <nav className="nav-tabs">
          <button
            type="button"
            className={`nav-tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('create')
              setError('')
              setSuccessMsg('')
            }}
          >
            <span>📝</span> New Invoice
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('history')
              setError('')
              setSuccessMsg('')
              fetchInvoices()
            }}
          >
            <span>📋</span> Invoices History
            <span className="count-badge">{invoices.length}</span>
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Banner Alerts */}
        {error && (
          <div className="alert alert-error no-print" role="alert">
            <span className="alert-icon">⚠️</span>
            <div className="alert-body">{error}</div>
            <button type="button" className="alert-close" onClick={() => setError('')}>
              ×
            </button>
          </div>
        )}

        {successMsg && (
          <div className="alert alert-success no-print" role="alert">
            <span className="alert-icon">✓</span>
            <div className="alert-body">{successMsg}</div>
            <button type="button" className="alert-close" onClick={() => setSuccessMsg('')}>
              ×
            </button>
          </div>
        )}

        {/* ===================== TAB 1: CREATE NEW INVOICE ===================== */}
        {activeTab === 'create' && (
          <div className="tab-pane no-print">
            <div className="dashboard-grid">
              {/* Left Column: Form Entry */}
              <div className="form-column">
                <form onSubmit={handleSaveInvoice}>
                  {/* Step 1: Customer Details */}
                  <div className="card">
                    <div className="card-header">
                      <div className="step-tag">01</div>
                      <div>
                        <h2 className="card-title">Customer Information</h2>
                        <p className="card-desc">Enter customer details for invoice generation</p>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="form-group">
                        <label htmlFor="customerName" className="form-label">
                          Customer Full Name <span className="req">*</span>
                        </label>
                        <input
                          id="customerName"
                          type="text"
                          className="form-control"
                          placeholder="e.g. Priya Sharma"
                          value={customerName}
                          onChange={(e) => {
                            setCustomerName(e.target.value)
                            setPreviewBill(null)
                            setError('')
                          }}
                          maxLength={100}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Line Items */}
                  <div className="card">
                    <div className="card-header">
                      <div className="step-tag">02</div>
                      <div className="header-grow">
                        <h2 className="card-title">Bill Items</h2>
                        <p className="card-desc">Select products and specify quantities</p>
                      </div>
                      <span className="item-counter">
                        {rows.length} {rows.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>

                    <div className="card-body">
                      {loading ? (
                        <div className="loading-state">Loading product catalog from server...</div>
                      ) : (
                        <div className="table-responsive">
                          <table className="items-table">
                            <thead>
                              <tr>
                                <th style={{ width: '40%' }}>Product</th>
                                <th style={{ width: '20%' }}>Unit Price</th>
                                <th style={{ width: '20%' }}>Quantity</th>
                                <th style={{ width: '15%' }} className="text-right">
                                  Total
                                </th>
                                <th style={{ width: '5%' }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((row, index) => {
                                const prod = products.find((p) => String(p.id) === String(row.productId))
                                const isQtyValid = /^[1-9]\d*$/.test(String(row.quantity))
                                const lineTotal = prod && isQtyValid ? Number(prod.price) * Number(row.quantity) : 0

                                return (
                                  <tr key={index}>
                                    <td>
                                      <select
                                        className="form-control"
                                        value={row.productId}
                                        onChange={(e) => updateRow(index, 'productId', e.target.value)}
                                        aria-label={`Select product for row ${index + 1}`}
                                      >
                                        <option value="">Select a product...</option>
                                        {products.map((p) => (
                                          <option key={p.id} value={p.id}>
                                            {p.name} ({money(p.price)})
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="price-col">{prod ? money(prod.price) : '—'}</td>
                                    <td>
                                      <div className="qty-group">
                                        <button
                                          type="button"
                                          className="qty-btn"
                                          onClick={() => {
                                            const current = Number(row.quantity) || 1
                                            if (current > 1) updateRow(index, 'quantity', String(current - 1))
                                          }}
                                          disabled={Number(row.quantity) <= 1}
                                        >
                                          −
                                        </button>
                                        <input
                                          type="number"
                                          min="1"
                                          step="1"
                                          className={`form-control qty-input ${!isQtyValid ? 'is-invalid' : ''}`}
                                          value={row.quantity}
                                          onChange={(e) => updateRow(index, 'quantity', e.target.value)}
                                          aria-label={`Quantity for row ${index + 1}`}
                                        />
                                        <button
                                          type="button"
                                          className="qty-btn"
                                          onClick={() => {
                                            const current = Number(row.quantity) || 0
                                            updateRow(index, 'quantity', String(current + 1))
                                          }}
                                        >
                                          +
                                        </button>
                                      </div>
                                    </td>
                                    <td className="text-right item-total">{money(lineTotal)}</td>
                                    <td className="text-center">
                                      <button
                                        type="button"
                                        className="btn-icon-danger"
                                        onClick={() => removeRow(index)}
                                        disabled={rows.length === 1}
                                        title="Delete row"
                                      >
                                        🗑
                                      </button>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <div className="card-actions">
                        <button type="button" className="btn btn-secondary" onClick={addRow}>
                          <span>＋</span> Add Item
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={resetForm}>
                          Reset All
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="form-actions-bar">
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={handleValidatePreview}
                      disabled={saving || loading}
                    >
                      {saving ? 'Calculating...' : '🔍 Preview Calculation'}
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving || loading || !customerName.trim()}
                    >
                      {saving ? 'Saving...' : '💾 Save & Generate Invoice'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Live Summary & Discounts */}
              <div className="summary-column">
                <div className="card summary-card">
                  <h3 className="summary-title">Summary & Discount</h3>

                  <div className="discount-banner">
                    <div className="discount-icon">%</div>
                    <div>
                      <strong>Smart Discount Rule</strong>
                      <p>Get an automatic 10% discount on orders exceeding ₹1,000.</p>
                      <span className="rule-note">Subtotals of ₹1,000 or below do not receive discount.</span>
                    </div>
                  </div>

                  <div className="summary-rows">
                    <div className="summary-row">
                      <span>Subtotal</span>
                      <strong>{money(subtotal)}</strong>
                    </div>

                    <div className="summary-row">
                      <span>
                        Discount{' '}
                        <span className={`badge ${subtotal > 1000 ? 'badge-success' : 'badge-neutral'}`}>
                          {subtotal > 1000 ? '10% Applied' : 'Not eligible'}
                        </span>
                      </span>
                      <strong className={discountAmount > 0 ? 'text-discount' : ''}>
                        − {money(discountAmount)}
                      </strong>
                    </div>

                    <div className="summary-divider" />

                    <div className="summary-row total-highlight">
                      <span>Final Amount Due</span>
                      <span className="grand-total">{money(finalAmount)}</span>
                    </div>
                  </div>

                  {previewBill && (
                    <div className="preview-status-box">
                      <span className="status-dot green" />
                      <div>
                        <strong>Server Validated</strong>
                        <p>Customer: {previewBill.customerName}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: INVOICE HISTORY ===================== */}
        {activeTab === 'history' && (
          <div className="tab-pane no-print">
            {/* Quick Stats Cards */}
            <div className="stats-row">
              <div className="stat-card">
                <span className="stat-label">Total Invoices</span>
                <span className="stat-value">{invoices.length}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Total Revenue</span>
                <span className="stat-value text-accent">{money(totalRevenue)}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Total Discounts Given</span>
                <span className="stat-value">{money(totalDiscount)}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Avg. Invoice Value</span>
                <span className="stat-value">
                  {invoices.length ? money(totalRevenue / invoices.length) : money(0)}
                </span>
              </div>
            </div>

            {/* Invoices List Card */}
            <div className="card history-card">
              <div className="card-header history-header">
                <div>
                  <h2 className="card-title">Saved Invoices</h2>
                  <p className="card-desc">Permanent records stored in the persistent H2 database</p>
                </div>
                <div className="search-wrap">
                  <span className="search-icon">🔍</span>
                  <input
                    type="search"
                    className="search-input"
                    placeholder="Search by customer or invoice #..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button type="button" className="search-clear" onClick={() => setSearchTerm('')}>
                      ×
                    </button>
                  )}
                </div>
              </div>

              <div className="card-body">
                {fetchingInvoices ? (
                  <div className="loading-state">Loading invoice history...</div>
                ) : invoices.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon">📂</span>
                    <h3>No invoices found</h3>
                    <p>
                      {searchTerm
                        ? `No results match "${searchTerm}". Try a different keyword.`
                        : 'Create your first invoice to view it here.'}
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        setActiveTab('create')
                        setSearchTerm('')
                      }}
                    >
                      Create First Invoice
                    </button>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="invoices-table">
                      <thead>
                        <tr>
                          <th>Invoice #</th>
                          <th>Date</th>
                          <th>Customer</th>
                          <th>Items</th>
                          <th>Subtotal</th>
                          <th>Discount</th>
                          <th className="text-right">Final Amount</th>
                          <th className="text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((inv) => (
                          <tr key={inv.id}>
                            <td className="inv-number">{inv.invoiceNumber}</td>
                            <td className="text-muted">{formatDate(inv.createdAt)}</td>
                            <td className="customer-cell">
                              <strong>{inv.customerName}</strong>
                            </td>
                            <td>
                              <span className="badge badge-neutral">{inv.items?.length || 0} items</span>
                            </td>
                            <td>{money(inv.subtotal)}</td>
                            <td>
                              {Number(inv.discountAmount) > 0 ? (
                                <span className="text-discount">−{money(inv.discountAmount)}</span>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                            <td className="text-right">
                              <strong>{money(inv.finalAmount)}</strong>
                            </td>
                            <td className="text-center actions-cell">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline"
                                onClick={() => setActiveInvoice(inv)}
                                title="View & Print Invoice"
                              >
                                👁 View / Print
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-ghost"
                                onClick={() => downloadReceipt(inv)}
                                title="Download Receipt text"
                              >
                                ⬇ Download
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================== INVOICE MODAL / RECEIPT VIEW ===================== */}
        {activeInvoice && (
          <div className="modal-backdrop">
            <div className="modal-content">
              {/* Receipt Document */}
              <div className="invoice-document" id="printable-invoice">
                <div className="invoice-doc-header">
                  <div>
                    <h2 className="company-name">Simple Billing Co.</h2>
                    <p className="doc-meta">Official Tax Invoice / Cash Receipt</p>
                  </div>
                  <div className="invoice-meta-box">
                    <div className="meta-badge">PAID / VERIFIED</div>
                    <p>
                      <strong>Invoice:</strong> {activeInvoice.invoiceNumber}
                    </p>
                    <p>
                      <strong>Date:</strong> {formatDate(activeInvoice.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="invoice-customer-info">
                  <span className="sub-label">Billed To:</span>
                  <h3>{activeInvoice.customerName}</h3>
                </div>

                <table className="doc-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Product Description</th>
                      <th className="text-right">Unit Price</th>
                      <th className="text-center">Qty</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeInvoice.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{item.productName}</td>
                        <td className="text-right">{money(item.price)}</td>
                        <td className="text-center">{item.quantity}</td>
                        <td className="text-right">{money(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="doc-totals">
                  <div className="doc-total-row">
                    <span>Subtotal:</span>
                    <strong>{money(activeInvoice.subtotal)}</strong>
                  </div>
                  <div className="doc-total-row">
                    <span>Discount ({activeInvoice.discountPercent}%):</span>
                    <strong className="text-discount">− {money(activeInvoice.discountAmount)}</strong>
                  </div>
                  <div className="doc-total-row doc-grand-total">
                    <span>Grand Total:</span>
                    <strong>{money(activeInvoice.finalAmount)}</strong>
                  </div>
                </div>

                <div className="doc-footer">
                  <p>Thank you for choosing Simple Billing Co.</p>
                  <p className="small-text">This is a computer-generated invoice and requires no signature.</p>
                </div>
              </div>

              {/* Modal Buttons (Hidden during printing) */}
              <div className="modal-actions no-print">
                <button type="button" className="btn btn-secondary" onClick={() => downloadReceipt(activeInvoice)}>
                  ⬇ Download Receipt
                </button>
                <button type="button" className="btn btn-primary" onClick={() => window.print()}>
                  🖨 Print Invoice
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setActiveInvoice(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="footer no-print">
        <p>Simple Billing Application &bull; Spring Boot + H2 Database + React</p>
      </footer>
    </div>
  )
}
