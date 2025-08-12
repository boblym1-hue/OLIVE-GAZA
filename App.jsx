import React, { useEffect, useMemo, useState } from "react";

// --- Helpers ---
const uid = () => Math.random().toString(36).slice(2);
const DEFAULT_UNITS = ["كغ", "لتر", "علبة", "حزمة", "قطعة"];
const PRIORITIES = [
  { key: "low", label: "منخفض" },
  { key: "med", label: "متوسط" },
  { key: "high", label: "عاجل" },
];
const STATUSES = [
  { key: "new", label: "جديد" },
  { key: "sent", label: "أُرسل للمورد" },
  { key: "ack", label: "تم الاستلام" },
  { key: "prep", label: "قيد التجهيز" },
  { key: "delivered", label: "تم التسليم" },
  { key: "cancelled", label: "أُلغي" },
];

function saveToStorage(data) {
  localStorage.setItem("olive-shortages", JSON.stringify(data));
}
function loadFromStorage() {
  try {
    const raw = localStorage.getItem("olive-shortages");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
function classNames(...arr) {
  return arr.filter(Boolean).join(" ");
}

// --- i18n helpers ---
const DICT = {
  ar: {
    title: "Olive – طلبات المواد",
    mvp: "نموذج أولي",
    shortcutsTitle: "اختصارات",
    shortcuts1: "النموذج أعلاه للاستخدام السريع من الطاقم.",
    shortcuts2: "المدير يستطيع تعيين المورد وإرسال الطلب.",
    shortcuts3: "المورد يرى الطلبات الموجهة له ويحدث الحالة.",
    filters: "بحث وتصفية",
    searchPlaceholder: "بحث بالاسم/الفئة/ملاحظات",
    allSuppliers: "كل الموردين",
    allStatuses: "كل الحالات",
    chooseSupplier: "اختر المورد",
    orders: "الطلبات",
    none: "—",
    staff: "طاقم",
    manager: "مدير",
    supplier: "مورد",
    addItemTitle: "إضافة مادة ناقصة – (طاقم)",
    namePlaceholder: "اسم المادة (مثال: طماطم)",
    qty: "الكمية",
    unit: "الوحدة",
    category: "الفئة (خضار/لحوم/ألبان...)",
    neededBy: "بحاجة قبل",
    notes: "ملاحظات (مثال: نحتاج الحجم الكبير)",
    add: "إضافة",
    sendSelected: "إرسال المحدد",
    actions: "إجراءات",
    send: "إرسال",
    delete: "حذف",
    supplierBoard: "لوحة المورد",
    chooseSupplierTop: "اختر المورد",
    etaPlaceholder: "وقت التسليم المتوقع (مثال: اليوم 18:00)",
    noItemsYet: "لا توجد عناصر بعد.",
    noSupplierItems: "لا توجد طلبات حالياً لهذا المورد.",
    addSupplier: "إضافة مورد",
    supplierName: "اسم المورد",
    suppliersCount: "عدد الموردين",
  },
  en: {
    title: "Olive – Inventory Requests",
    mvp: "MVP",
    shortcutsTitle: "Shortcuts",
    shortcuts1: "Quick form above for staff.",
    shortcuts2: "Manager can assign supplier and send.",
    shortcuts3: "Supplier sees assigned requests and updates status.",
    filters: "Filters & Search",
    searchPlaceholder: "Search by name/category/notes",
    allSuppliers: "All suppliers",
    allStatuses: "All statuses",
    chooseSupplier: "Choose supplier",
    orders: "Orders",
    none: "—",
    staff: "Staff",
    manager: "Manager",
    supplier: "Supplier",
    addItemTitle: "Add shortage (Staff)",
    namePlaceholder: "Item name (e.g., Tomatoes)",
    qty: "Qty",
    unit: "Unit",
    category: "Category (veg/meat/dairy…)",
    neededBy: "Needed by",
    notes: "Notes (e.g., large size)",
    add: "Add",
    sendSelected: "Send selected",
    actions: "Actions",
    send: "Send",
    delete: "Delete",
    supplierBoard: "Supplier Panel",
    chooseSupplierTop: "Choose supplier",
    etaPlaceholder: "ETA (e.g., Today 18:00)",
    noItemsYet: "No items yet.",
    noSupplierItems: "No requests for this supplier yet.",
    addSupplier: "Add Supplier",
    supplierName: "Supplier name",
    suppliersCount: "Suppliers",
  },
};
const t = (lang, key) => DICT[lang]?.[key] || key;

// --- Main App ---
export default function App() {
  const [role, setRole] = useState("manager"); // staff | manager | supplier
  const [lang, setLang] = useState(() => localStorage.getItem("olive-lang") || "ar");
  const [suppliers, setSuppliers] = useState(() => {
    try {
      const raw = localStorage.getItem("olive-suppliers");
      return raw ? JSON.parse(raw) : [
        { id: "s1", name: "Sidra Company" },
        { id: "s2", name: "M D" },
      ];
    } catch {
      return [
        { id: "s1", name: "Sidra Company" },
        { id: "s2", name: "M D" },
      ];
    }
  });
  const [items, setItems] = useState(() => loadFromStorage());
  const [supplierFilter, setSupplierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [activeSupplierPortal, setActiveSupplierPortal] = useState("");

  useEffect(() => saveToStorage(items), [items]);
  useEffect(() => localStorage.setItem("olive-lang", lang), [lang]);
  useEffect(() => localStorage.setItem("olive-suppliers", JSON.stringify(suppliers)), [suppliers]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const okSupplier = supplierFilter ? it.supplierId === supplierFilter : true;
      const okStatus = statusFilter ? it.status === statusFilter : true;
      const okSearch = search
        ? (it.name + " " + (it.category || "") + " " + (it.notes || "")).toLowerCase().includes(search.toLowerCase())
        : true;
      return okSupplier && okStatus && okSearch;
    });
  }, [items, supplierFilter, statusFilter, search]);

  function upsertItem(next) {
    setItems((prev) => {
      const i = prev.findIndex((p) => p.id === next.id);
      const out = [...prev];
      if (i === -1) out.push(next);
      else out[i] = next;
      return out;
    });
  }

  function addItem(data) {
    const now = new Date().toISOString();
    const it = {
      id: uid(),
      name: data.name.trim(),
      quantity: Number(data.quantity || 1),
      unit: data.unit || DEFAULT_UNITS[0],
      category: data.category || "",
      priority: data.priority || "med",
      neededBy: data.neededBy || "",
      notes: data.notes || "",
      status: "new",
      supplierId: data.supplierId || "",
      createdAt: now,
      updatedAt: now,
      eta: "",
    };
    setItems((prev) => [...prev, it]);
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  function bulkSendToSupplier(ids, supplierId) {
    setItems((prev) =>
      prev.map((x) =>
        ids.includes(x.id)
          ? { ...x, supplierId, status: "sent", updatedAt: new Date().toISOString() }
          : x
      )
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold">{t(lang, "title")}</span>
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{t(lang, "mvp")}</span>
          </div>
          <div className="flex items-center gap-2">
            <LangSwitch lang={lang} setLang={setLang} />
            <RoleSwitch role={role} setRole={setRole} labels={{
              staff: t(lang, "staff"),
              manager: t(lang, "manager"),
              supplier: t(lang, "supplier"),
            }} />
            {role === "supplier" && (
              <select
                className="border rounded-lg px-3 py-2"
                value={activeSupplierPortal}
                onChange={(e) => setActiveSupplierPortal(e.target.value)}
              >
                <option value="">— {t(lang, "chooseSupplierTop")} —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid gap-6 lg:grid-cols-3">
        {/* Left: form / supplier panel */}
        <section className="lg:col-span-1">
          {role === "supplier" ? (
            <SupplierPanel
              supplierId={activeSupplierPortal}
              suppliers={suppliers}
              items={items}
              onUpdate={upsertItem}
              lang={lang}
            />
          ) : (
            <ShortageForm onSubmit={addItem} lang={lang} />
          )}

          <div className="mt-6 p-4 bg-white rounded-2xl shadow-sm border">
            <h3 className="font-semibold mb-3">{t(lang, "shortcutsTitle")}</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
              <li>{t(lang, "shortcuts1")}</li>
              <li>{t(lang, "shortcuts2")}</li>
              <li>{t(lang, "shortcuts3")}</li>
            </ul>
          </div>
        </section>

        {/* Right: list & controls */}
        <section className="lg:col-span-2">
          <div className="p-4 bg-white rounded-2xl shadow-sm border mb-4">
            <h3 className="font-semibold mb-3">{t(lang, "filters")}</h3>
            <div className="grid md:grid-cols-4 gap-3">
              <input
                className="border rounded-lg px-3 py-2 md:col-span-2"
                placeholder={t(lang, "searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="border rounded-lg px-3 py-2"
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
              >
                <option value="">{t(lang, "allSuppliers")}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <select
                className="border rounded-lg px-3 py-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">{t(lang, "allStatuses")}</option>
                {STATUSES.map((st) => (
                  <option key={st.key} value={st.key}>{st.label}</option>
                ))}
              </select>
            </div>
          </div>

          <AddSupplierCard suppliers={suppliers} setSuppliers={setSuppliers} lang={lang} />

          <ManagerTable
            role={role}
            items={filtered}
            suppliers={suppliers}
            onUpdate={upsertItem}
            onRemove={removeItem}
            onBulkSend={bulkSendToSupplier}
            lang={lang}
          />
        </section>
      </main>
    </div>
  );
}

// --- Components ---
function LangSwitch({ lang, setLang }) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
      {["ar", "en"].map((code) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          className={classNames(
            "px-3 py-1 rounded-lg text-sm",
            lang === code ? "bg-white shadow border" : "text-slate-600"
          )}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function RoleSwitch({ role, setRole, labels }) {
  const opts = [
    { key: "staff", label: labels.staff },
    { key: "manager", label: labels.manager },
    { key: "supplier", label: labels.supplier },
  ];
  return (
    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => setRole(o.key)}
          className={classNames(
            "px-3 py-1 rounded-lg text-sm",
            role === o.key ? "bg-white shadow border" : "text-slate-600"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ShortageForm({ onSubmit, lang }) {
  const [form, setForm] = useState({ quantity: 1, unit: DEFAULT_UNITS[0], priority: "med" });

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit(e) {
    e.preventDefault();
    if (!form.name) return;
    onSubmit(form);
    setForm({ quantity: 1, unit: DEFAULT_UNITS[0], priority: "med" });
  }

  return (
    <form onSubmit={submit} className="p-4 bg-white rounded-2xl shadow-sm border">
      <h3 className="font-semibold mb-4">{t(lang, "addItemTitle")}</h3>
      <div className="grid gap-3">
        <input
          className="border rounded-lg px-3 py-2"
          placeholder={t(lang, "namePlaceholder")}
          value={form.name || ""}
          onChange={(e) => update("name", e.target.value)}
          required
        />
        <div className="grid grid-cols-3 gap-3">
          <input
            type="number"
            min={0}
            className="border rounded-lg px-3 py-2"
            placeholder={t(lang, "qty")}
            value={form.quantity}
            onChange={(e) => update("quantity", e.target.value)}
          />
          <select
            className="border rounded-lg px-3 py-2"
            value={form.unit}
            onChange={(e) => update("unit", e.target.value)}
          >
            {DEFAULT_UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <select
            className="border rounded-lg px-3 py-2"
            value={form.priority}
            onChange={(e) => update("priority", e.target.value)}
          >
            {PRIORITIES.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            className="border rounded-lg px-3 py-2"
            placeholder={t(lang, "category")}
            value={form.category || ""}
            onChange={(e) => update("category", e.target.value)}
          />
          <input
            type="date"
            className="border rounded-lg px-3 py-2"
            value={form.neededBy || ""}
            onChange={(e) => update("neededBy", e.target.value)}
          />
        </div>
        <textarea
          className="border rounded-lg px-3 py-2"
          placeholder={t(lang, "notes")}
          value={form.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
          rows={3}
        />
        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2 font-medium"
        >
          {t(lang, "add")}
        </button>
      </div>
    </form>
  );
}

function ManagerTable({ role, items, suppliers, onUpdate, onRemove, onBulkSend, lang }) {
  const [selected, setSelected] = useState([]);
  const [bulkSupplier, setBulkSupplier] = useState("");

  function toggle(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function updateField(item, field, value) {
    onUpdate({ ...item, [field]: value, updatedAt: new Date().toISOString() });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{t(lang, "orders")}</span>
          <span className="text-xs text-slate-500">({items.length})</span>
        </div>
        {role === "manager" && (
          <div className="flex items-center gap-2">
            <select
              className="border rounded-lg px-3 py-2"
              value={bulkSupplier}
              onChange={(e) => setBulkSupplier(e.target.value)}
            >
              <option value="">— {t(lang, "chooseSupplier")} —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button
              className="px-3 py-2 rounded-lg border bg-white disabled:opacity-50"
              disabled={!selected.length || !bulkSupplier}
              onClick={() => {
                onBulkSend(selected, bulkSupplier);
                setSelected([]);
              }}
            >
              {t(lang, "sendSelected")}
            </button>
          </div>
        )}
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3 text-right w-10">{role === "manager" ? "✔" : "#"}</th>
              <th className="p-3 text-right">المادة</th>
              <th className="p-3 text-right">كمية</th>
              <th className="p-3 text-right">مورد</th>
              <th className="p-3 text-right">أولوية</th>
              <th className="p-3 text-right">حالة</th>
              <th className="p-3 text-right">{t(lang, "neededBy")}</th>
              <th className="p-3 text-right">ملاحظات</th>
              <th className="p-3 text-right w-28">{t(lang, "actions")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={it.id} className="border-t align-top">
                <td className="p-3">
                  {role === "manager" ? (
                    <input type="checkbox" checked={selected.includes(it.id)} onChange={() => toggle(it.id)} />
                  ) : (
                    <span className="text-slate-400">{idx + 1}</span>
                  )}
                </td>
                <td className="p-3">
                  <div className="font-medium">{it.name}</div>
                  <div className="text-xs text-slate-500">{it.category}</div>
                </td>
                <td className="p-3 whitespace-nowrap">{it.quantity} {it.unit}</td>
                <td className="p-3">
                  {role === "manager" ? (
                    <select
                      className="border rounded-lg px-2 py-1"
                      value={it.supplierId || ""}
                      onChange={(e) => updateField(it, "supplierId", e.target.value)}
                    >
                      <option value="">— {t(lang, "none")} —</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-slate-700">{suppliers.find((s) => s.id === it.supplierId)?.name || t(lang, "none")}</span>
                  )}
                </td>
                <td className="p-3">
                  {role === "manager" ? (
                    <select
                      className="border rounded-lg px-2 py-1"
                      value={it.priority}
                      onChange={(e) => updateField(it, "priority", e.target.value)}
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p.key} value={p.key}>{p.label}</option>
                      ))}
                    </select>
                  ) : (
                    <BadgePriority p={it.priority} />
                  )}
                </td>
                <td className="p-3">
                  {role === "manager" ? (
                    <select
                      className="border rounded-lg px-2 py-1"
                      value={it.status}
                      onChange={(e) => updateField(it, "status", e.target.value)}
                    >
                      {STATUSES.map((st) => (
                        <option key={st.key} value={st.key}>{st.label}</option>
                      ))}
                    </select>
                  ) : (
                    <StatusPill status={it.status} />
                  )}
                  {!!it.eta && (
                    <div className="text-xs text-slate-500 mt-1">ETA: {it.eta}</div>
                  )}
                </td>
                <td className="p-3 whitespace-nowrap">{it.neededBy || t(lang, "none")}</td>
                <td className="p-3 max-w-[20ch]">
                  <div className="text-slate-700 whitespace-pre-wrap">{it.notes}</div>
                </td>
                <td className="p-3 space-y-2">
                  {role === "manager" && (
                    <>
                      <button
                        className="w-full border rounded-lg px-2 py-1"
                        onClick={() => updateField(it, "status", "sent")}
                      >
                        {t(lang, "send")}
                      </button>
                      <button
                        className="w-full border rounded-lg px-2 py-1 text-red-600"
                        onClick={() => onRemove(it.id)}
                      >
                        {t(lang, "delete")}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}

            {!items.length && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-slate-500">{t(lang, "noItemsYet")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddSupplierCard({ suppliers, setSuppliers, lang }) {
  const [name, setName] = useState("");
  return (
    <div className="p-4 bg-white rounded-2xl shadow-sm border mb-4">
      <h3 className="font-semibold mb-3">{t(lang, "addSupplier")}</h3>
      <div className="flex items-center gap-2">
        <input
          className="border rounded-lg px-3 py-2 flex-1"
          placeholder={t(lang, "supplierName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white disabled:opacity-50"
          onClick={() => {
            if (!name.trim()) return;
            setSuppliers((prev) => [...prev, { id: uid(), name: name.trim() }]);
            setName("");
          }}
        >{t(lang, "add")}</button>
      </div>
      <div className="text-xs text-slate-500 mt-2">{t(lang, "suppliersCount")}: {suppliers.length}</div>
    </div>
  );
}

function SupplierPanel({ supplierId, suppliers, items, onUpdate, lang }) {
  const myItems = useMemo(() => items.filter((i) => i.supplierId === supplierId), [items, supplierId]);
  if (!supplierId) {
    return (
      <div className="p-4 bg-white rounded-2xl shadow-sm border">
        <h3 className="font-semibold mb-2">{t(lang, "supplierBoard")}</h3>
        <p className="text-sm text-slate-600">{t(lang, "chooseSupplierTop")}</p>
      </div>
    );
  }
  const supName = suppliers.find((s) => s.id === supplierId)?.name || t(lang, "none");
  return (
    <div className="p-4 bg-white rounded-2xl shadow-sm border">
      <h3 className="font-semibold mb-2">{t(lang, "supplierBoard")} – {supName}</h3>
      <p className="text-sm text-slate-600 mb-4">يمكن للمورد تحديث حالة الطلب وتحديد وقت التسليم المتوقع.</p>
      <div className="space-y-3">
        {myItems.map((it) => (
          <div key={it.id} className="border rounded-xl p-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{it.name}</div>
                <div className="text-xs text-slate-500">{it.quantity} {it.unit} · أولوية: {PRIORITIES.find((p) => p.key === it.priority)?.label}</div>
                {it.notes && <div className="text-xs text-slate-600 mt-1">ملاحظات: {it.notes}</div>}
              </div>
              <StatusPill status={it.status} />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <select
                className="border rounded-lg px-2 py-1"
                value={it.status}
                onChange={(e) => onUpdate({ ...it, status: e.target.value, updatedAt: new Date().toISOString() })}
              >
                {STATUSES.filter((s) => ["sent", "ack", "prep", "delivered", "cancelled"].includes(s.key)).map((st) => (
                  <option key={st.key} value={st.key}>{st.label}</option>
                ))}
              </select>
              <input
                className="border rounded-lg px-2 py-1"
                placeholder={t(lang, "etaPlaceholder")}
                value={it.eta || ""}
                onChange={(e) => onUpdate({ ...it, eta: e.target.value, updatedAt: new Date().toISOString() })}
              />
            </div>
          </div>
        ))}
        {!myItems.length && (
          <div className="text-sm text-slate-500">{t(lang, "noSupplierItems")}</div>
        )}
      </div>
    </div>
  );
}

function BadgePriority({ p }) {
  const map = {
    low: "bg-slate-100 text-slate-700 border-slate-200",
    med: "bg-amber-50 text-amber-700 border-amber-200",
    high: "bg-rose-50 text-rose-700 border-rose-200",
  };
  const lbl = PRIORITIES.find((x) => x.key === p)?.label || p;
  return <span className={"inline-block text-xs px-2 py-1 border rounded-full " + (map[p] || map.med)}>{lbl}</span>;
}

function StatusPill({ status }) {
  const map = {
    new: "bg-slate-100 text-slate-700 border-slate-200",
    sent: "bg-blue-50 text-blue-700 border-blue-200",
    ack: "bg-violet-50 text-violet-700 border-violet-200",
    prep: "bg-amber-50 text-amber-700 border-amber-200",
    delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  };
  const lbl = STATUSES.find((x) => x.key === status)?.label || status;
  return <span className={"inline-block text-xs px-2 py-1 border rounded-full " + (map[status] || map.new)}>{lbl}</span>;
}
