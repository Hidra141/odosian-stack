"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToastStore } from "@/stores/toast";

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  headers: Record<string, string>;
  lastFiredAt: string | null;
  lastStatus: number | null;
  createdAt: string;
}

const AVAILABLE_EVENTS = [
  "rule.created",
  "rule.updated",
  "rule.deleted",
  "analysis.completed",
  "user.login",
];

const emptyForm = {
  name: "",
  url: "",
  events: [] as string[],
  secret: "",
  headers: "{}",
  isActive: true,
};

export function WebhooksTab() {
  const { addToast } = useToastStore();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Webhook | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch("/api/webhooks");
      const data = await res.json();
      if (res.ok) setWebhooks(data.webhooks);
    } catch {
      addToast("error", "Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchWebhooks(); }, [fetchWebhooks]);

  const handleEdit = (w: Webhook) => {
    setEditId(w.id);
    setForm({
      name: w.name,
      url: w.url,
      events: w.events,
      secret: "",
      headers: JSON.stringify(w.headers, null, 2),
      isActive: w.isActive,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.url || form.events.length === 0) {
      addToast("error", "Name, URL, and at least one event are required");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = { ...form };
      if (editId && !form.secret) delete body.secret;

      const res = await fetch(editId ? `/api/webhooks/${editId}` : "/api/webhooks", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        addToast("success", editId ? "Webhook updated" : "Webhook created");
        setShowForm(false);
        setEditId(null);
        setForm(emptyForm);
        fetchWebhooks();
      } else {
        const err = await res.json();
        addToast("error", err.error || "Failed to save webhook");
      }
    } catch {
      addToast("error", "Failed to save webhook");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/webhooks/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      addToast("success", "Webhook deleted");
      fetchWebhooks();
    } else {
      addToast("error", "Failed to delete webhook");
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    try {
      const res = await fetch(`/api/webhooks/${id}/test`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        addToast(data.status >= 200 && data.status < 300 ? "success" : "warning",
          `Test result: HTTP ${data.status || "failed"}`);
        fetchWebhooks();
      } else {
        addToast("error", "Test failed");
      }
    } catch {
      addToast("error", "Test request failed");
    } finally {
      setTesting(null);
    }
  };

  const handleToggleActive = async (w: Webhook) => {
    const res = await fetch(`/api/webhooks/${w.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !w.isActive }),
    });
    if (res.ok) {
      addToast("success", w.isActive ? "Webhook disabled" : "Webhook enabled");
      fetchWebhooks();
    }
  };

  const toggleEvent = (event: string) => {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  if (loading) return <p className="text-text-muted text-center py-8">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-text-secondary">
          Configure HTTP webhooks to receive event notifications.
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
          {showForm ? "Cancel" : "+ Add Webhook"}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="My Webhook"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">URL</label>
                  <input
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="https://example.com/webhook"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Events</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_EVENTS.map((event) => (
                    <button
                      key={event}
                      onClick={() => toggleEvent(event)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                        form.events.includes(event)
                          ? "bg-primary/15 text-primary border-primary/30"
                          : "bg-surface-light text-text-secondary border-border hover:border-primary/30"
                      }`}
                    >
                      {event}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Secret {editId && <span className="text-text-muted font-normal">(leave empty to keep existing)</span>}
                  </label>
                  <input
                    type="password"
                    value={form.secret}
                    onChange={(e) => setForm({ ...form, secret: e.target.value })}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="HMAC signing secret"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Custom Headers (JSON)</label>
                  <input
                    type="text"
                    value={form.headers}
                    onChange={(e) => setForm({ ...form, headers: e.target.value })}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder='{"X-Custom": "value"}'
                  />
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editId ? "Update Webhook" : "Create Webhook"}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {webhooks.length === 0 ? (
        <p className="text-center text-text-muted py-8">No webhooks configured.</p>
      ) : (
        <div className="space-y-3">
          {webhooks.map((w) => (
            <Card key={w.id}>
              <CardBody>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-text">{w.name}</h3>
                      <Badge preset={w.isActive ? "production" : "deprecated"}>
                        {w.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-muted truncate mb-2">{w.url}</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {w.events.map((e) => (
                        <Badge key={e} preset="info">{e}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      {w.secret && <span>Secret: {w.secret}</span>}
                      {w.lastFiredAt && (
                        <span>
                          Last fired: {new Date(w.lastFiredAt).toLocaleString()}
                          {w.lastStatus !== null && (
                            <span className={w.lastStatus >= 200 && w.lastStatus < 300 ? " text-success" : " text-danger"}>
                              {" "}(HTTP {w.lastStatus})
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => handleToggleActive(w)}>
                      {w.isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleTest(w.id)} disabled={testing === w.id}>
                      {testing === w.id ? "..." : "Test"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(w)}>Edit</Button>
                    <Button variant="danger" size="sm" onClick={() => setDeleteTarget(w)}>Delete</Button>
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
        title="Delete Webhook"
        message={`Delete webhook "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
