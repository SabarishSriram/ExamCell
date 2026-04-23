import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Package, Plus, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const BOOKLET_TYPES = ["40-page", "15-page"];

const InventoryView = () => {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ type: "40-page", quantity: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchStock = async () => {
    try {
      setLoading(true);
      const res = await api.get("/inventory");
      setStock(res.data);
    } catch {
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const handleAddStock = async (e) => {
    e.preventDefault();
    const qty = parseInt(form.quantity, 10);
    if (!form.type || !qty || qty <= 0) {
      toast.error("Please select a type and enter a valid quantity");
      return;
    }
    try {
      setSubmitting(true);
      await api.post("/inventory/add-stock", { type: form.type, quantity: qty });
      await fetchStock();
      setAddOpen(false);
      setForm({ type: "40-page", quantity: "" });
      toast.success(`Added ${qty} ${form.type} booklets to stock`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add stock");
    } finally {
      setSubmitting(false);
    }
  };

  const getStockLevel = (type) => {
    const entry = stock.find((s) => s.type === type);
    return entry ? entry.quantity : 0;
  };

  const getUpdatedAt = (type) => {
    const entry = stock.find((s) => s.type === type);
    return entry?.updatedAt ? format(new Date(entry.updatedAt), "PPP p") : "—";
  };

  const stockCards = [
    {
      type: "40-page",
      label: "40-Page Booklets",
      color: "blue",
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      type: "15-page",
      label: "15-Page Booklets",
      color: "violet",
      bg: "bg-violet-50",
      border: "border-violet-200",
      text: "text-violet-700",
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
    },
  ];

  return (
    <main className="container mx-auto py-12 px-6">
      <div className="mb-10 flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-2">
            Inventory
          </h1>
          <p className="text-slate-500 font-medium tracking-tight">
            Track booklet stock levels for examinations.
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 h-11 px-6 rounded-xl"
        >
          <Plus className="w-4 h-4" />
          <span className="font-semibold text-sm">Add Stock</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
          {stockCards.map(({ type, label, bg, border, text, iconBg, iconColor }) => {
            const qty = getStockLevel(type);
            const updatedAt = getUpdatedAt(type);
            const isLow = qty < 50;
            return (
              <div
                key={type}
                className={`rounded-2xl border-2 ${border} ${bg} p-6 flex flex-col gap-4 shadow-sm`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
                    <BookOpen className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  {isLow && qty === 0 && (
                    <span className="text-xs font-bold uppercase tracking-wide text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                      Out of Stock
                    </span>
                  )}
                  {isLow && qty > 0 && (
                    <span className="text-xs font-bold uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      Low Stock
                    </span>
                  )}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${text} mb-1`}>{label}</p>
                  <p className="text-4xl font-extrabold text-slate-900 leading-none">
                    {qty.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400 mt-2 font-medium">
                    Last updated {updatedAt}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setForm({ type: "40-page", quantity: "" }); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Add Stock
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddStock} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Booklet Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select booklet type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="40-page">40-Page Booklet</SelectItem>
                  <SelectItem value="15-page">15-Page Booklet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity to Add</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                placeholder="e.g. 200"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              />
              {form.type && (
                <p className="text-xs text-slate-500">
                  Current stock: <span className="font-bold">{getStockLevel(form.type).toLocaleString()}</span> → after add:{" "}
                  <span className="font-bold text-primary">
                    {(getStockLevel(form.type) + (parseInt(form.quantity, 10) || 0)).toLocaleString()}
                  </span>
                </p>
              )}
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Adding..." : "Add Stock"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default InventoryView;
