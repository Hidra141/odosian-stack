"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToastStore } from "@/stores/toast";

interface FieldDefinition {
  id: string;
  fieldName: string;
  label: string;
  fieldType: string;
  options: string[];
  required: boolean;
  defaultValue: string;
  sortOrder: number;
}

const FIELD_TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Textarea" },
  { value: "number", label: "Number" },
  { value: "select", label: "Select" },
  { value: "boolean", label: "Boolean" },
];

const emptyForm = {
  fieldName: "",
  label: "",
  fieldType: "text",
  options: "",
  required: false,
  defaultValue: "",
  sortOrder: 0,
};

export function CustomFieldsTab() {
  const { addToast } = useToastStore();
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FieldDefinition | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchFields = useCallback(async () => {
    try {
      const res = await fetch("/api/custom-fields");
      const data = await res.json();
      if (res.ok) setFields(data.fields);
    } catch {
      addToast("error", "Failed to load custom fields");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchFields(); }, [fetchFields]);

  const handleEdit = (f: FieldDefinition) => {
    setEditId(f.id);
    setForm({
      fieldName: f.fieldName,
      label: f.label,
      fieldType: f.fieldType,
      options: Array.isArray(f.options) ? f.options.join(", ") : "",
      required: f.required,
      defaultValue: f.defaultValue,
      sortOrder: f.sortOrder,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if ((!editId && !form.fieldName) || !form.label) {
      addToast("error", "Field name and label are required");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        label: form.label,
        fieldType: form.fieldType,
        options: form.fieldType === "select" ? JSON.stringify(form.options.split(",").map((o) => o.trim()).filter(Boolean)) : "[]",
        required: form.required,
        defaultValue: form.defaultValue,
        sortOrder: form.sortOrder,
      };
      if (!editId) body.fieldName = form.fieldName;

      const res = await fetch(editId ? `/api/custom-fields/${editId}` : "/api/custom-fields", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        addToast("success", editId ? "Field updated" : "Field created");
        setShowForm(false);
        setEditId(null);
        setForm(emptyForm);
        fetchFields();
      } else {
        const err = await res.json();
        addToast("error", err.error || "Failed to save field");
      }
    } catch {
      addToast("error", "Failed to save field");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/custom-fields/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      addToast("success", "Field deleted");
      fetchFields();
    } else {
      addToast("error", "Failed to delete field");
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  if (loading) return <p className="text-text-muted text-center py-8">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-text-secondary">
          Define custom fields that appear on every detection rule.
        </p>
        <Button
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              setEditId(null);
              setForm(emptyForm);
            } else {
              setShowForm(true);
            }
          }}
        >
          {showForm ? "Cancel" : "+ Add Field"}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {!editId && (
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">Field Name (snake_case)</label>
                    <input
                      type="text"
                      value={form.fieldName}
                      onChange={(e) => setForm({ ...form, fieldName: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                      className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="my_field"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Label</label>
                  <input
                    type="text"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="My Custom Field"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Type</label>
                  <Select
                    value={form.fieldType}
                    onChange={(e) => setForm({ ...form, fieldType: e.target.value })}
                    options={FIELD_TYPE_OPTIONS}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Default Value</label>
                  <input
                    type="text"
                    value={form.defaultValue}
                    onChange={(e) => setForm({ ...form, defaultValue: e.target.value })}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              {form.fieldType === "select" && (
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Options (comma-separated)</label>
                  <input
                    type="text"
                    value={form.options}
                    onChange={(e) => setForm({ ...form, options: e.target.value })}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="option1, option2, option3"
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cf-required"
                  checked={form.required}
                  onChange={(e) => setForm({ ...form, required: e.target.checked })}
                  className="rounded border-border"
                />
                <label htmlFor="cf-required" className="text-sm text-text">Required field</label>
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editId ? "Update Field" : "Create Field"}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {fields.length === 0 ? (
        <p className="text-center text-text-muted py-8">No custom fields defined.</p>
      ) : (
        <div className="space-y-2">
          {fields.map((f) => (
            <Card key={f.id}>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text">{f.label}</span>
                        <code className="text-xs text-text-muted bg-surface-light px-1.5 py-0.5 rounded">{f.fieldName}</code>
                        <Badge preset="info">{f.fieldType}</Badge>
                        {f.required && <Badge preset="high">Required</Badge>}
                      </div>
                      <div className="text-xs text-text-muted mt-0.5">
                        Order: {f.sortOrder}
                        {f.defaultValue && <span> · Default: {f.defaultValue}</span>}
                        {f.fieldType === "select" && Array.isArray(f.options) && f.options.length > 0 && (
                          <span> · Options: {f.options.join(", ")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(f)}>Edit</Button>
                    <Button variant="danger" size="sm" onClick={() => setDeleteTarget(f)}>Delete</Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Custom Field"
        message={`Delete "${deleteTarget?.label}"? All existing values for this field on rules will be permanently removed.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
