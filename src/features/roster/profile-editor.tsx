"use client";

import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import type { Member, MemberInput, MemberStatus, Role } from "@/domain/training";

type FeedbackKind = "success" | "error";
function sameMemberInput(first: MemberInput, second: MemberInput) {
  const comparable = (input: MemberInput) => ({
    ...input,
    roles: [...input.roles].sort(),
    positions: input.positions.split(", ").filter(Boolean).sort().join(", "),
  });
  return JSON.stringify(comparable(first)) === JSON.stringify(comparable(second));
}

const profilePositions = ["Passer", "Receiver", "Snapper", "Blitzer", "Defender"];

export function ProfileEditor({
  member,
  roster,
  role,
  isAdmin,
  onClose,
  onSave,
  onFeedback,
}: {
  member?: Member;
  roster: Member[];
  role: Role;
  isAdmin: boolean;
  onClose: () => void;
  onSave: (input: MemberInput) => void;
  onFeedback: (message: string, kind: FeedbackKind) => void;
}) {
  const [initialInput] = useState<MemberInput>(() =>
    member
      ? {
          name: member.name,
          number: member.number,
          positions: member.positions,
          units: member.units,
          roles: member.roles,
          isAdmin: member.isAdmin,
          status: member.status,
          photoUrl: member.photoUrl,
        }
      : {
          name: "",
          number: 0,
          positions: "",
          units: "Ataque e defesa",
          roles: [],
          isAdmin: false,
          status: "active",
          photoUrl: undefined,
        },
  );
  const [input, setInput] = useState(initialInput);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const set = <K extends keyof MemberInput>(key: K, value: MemberInput[K]) =>
    setInput((current) => ({ ...current, [key]: value }));
  const toggleRole = (value: Role) =>
    set(
      "roles",
      input.roles.includes(value)
        ? input.roles.filter((item) => item !== value)
        : [...input.roles, value],
    );
  const togglePosition = (value: string) => {
    const selected = input.positions
      .split(", ")
      .filter((item) => profilePositions.includes(item));
    set(
      "positions",
      selected.includes(value)
        ? selected.filter((item) => item !== value).join(", ")
        : [...selected, value].join(", "),
    );
  };
  const canManage = isAdmin;
  const isAthleteProfile = input.roles.includes("athlete");
  const invalid = {
    name: !input.name.trim(),
    roles: !input.roles.length,
    number:
      isAthleteProfile &&
      (!Number.isInteger(Number(input.number)) ||
        Number(input.number) < 0 ||
        Number(input.number) > 99),
    positions: isAthleteProfile && !input.positions.trim(),
  };
  const hasInvalid = Object.values(invalid).some(Boolean);
  const isDirty = !sameMemberInput(input, initialInput);
  const invalidClass =
    "!border-red-500 !ring-1 !ring-red-500/60 focus-visible:!outline-red-400";
  const save = () => {
    setSubmitted(true);
    if (hasInvalid) {
      const message = "Revise os campos destacados antes de salvar o perfil.";
      setError(message);
      onFeedback(message, "error");
      return;
    }
    try {
      onSave(input);
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : "Não foi possível salvar o perfil.";
      setError(message);
      onFeedback(message, "error");
    }
  };
  const uploadPhoto = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      set("photoUrl", typeof reader.result === "string" ? reader.result : undefined);
    reader.readAsDataURL(file);
  };
  return (
    <div
      className="overlay !fixed !inset-0 !z-50 !flex !items-center !justify-center bg-black/80 p-5 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="modal profile-modal !w-[min(900px,calc(100vw-40px))] !max-w-none max-h-[90vh] overflow-y-auto rounded-2xl border border-[#313943] bg-[#111419] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-editor-title"
      >
        <div className="panel-header flex items-start justify-between border-b border-[#283039] bg-transparent px-8 py-7 max-sm:px-5">
          <div>
            <p className="eyebrow">ELENCO</p>
            <h2 id="profile-editor-title">
              {member ? "Editar perfil" : "Adicionar integrante"}
            </h2>
          </div>
          <button
            className="close !grid !h-10 !w-10 !place-items-center !rounded-full !border !border-[#303740] !bg-[#20262c] !p-0 !text-2xl !text-[#dbe4ea] transition-colors hover:!bg-[#2a3945] hover:!text-[#83dfff] focus-visible:!outline focus-visible:!outline-2 focus-visible:!outline-[#2eb8ff]"
            aria-label="Fechar"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="editor-form grid gap-5 p-8 max-sm:p-5 [&_input:not([type=checkbox])]:w-full [&_input:not([type=checkbox])]:rounded-lg [&_input:not([type=checkbox])]:border [&_input:not([type=checkbox])]:border-[#303740] [&_input:not([type=checkbox])]:bg-[#0b0d10] [&_input:not([type=checkbox])]:p-3 [&_input:not([type=checkbox])]:text-[#f2f5f7] [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-[#303740] [&_select]:bg-[#0b0d10] [&_select]:p-3 [&_select]:text-[#f2f5f7] [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-[#303740] [&_textarea]:bg-[#0b0d10] [&_textarea]:p-3 [&_textarea]:text-[#f2f5f7] [&_input:focus-visible]:outline [&_input:focus-visible]:outline-2 [&_input:focus-visible]:outline-[#2eb8ff] [&_select:focus-visible]:outline [&_select:focus-visible]:outline-2 [&_select:focus-visible]:outline-[#2eb8ff] [&_textarea:focus-visible]:outline [&_textarea:focus-visible]:outline-2 [&_textarea:focus-visible]:outline-[#2eb8ff]">
          {canManage && (
            <fieldset
              className={`selection-panel role-selector ${submitted && invalid.roles ? "!border-red-500" : ""}`}
            >
              <legend>
                Atribuições{" "}
                <span
                  className={`required-mark ${input.roles.length ? "!text-[#8b949e]" : ""}`}
                >
                  *
                </span>
              </legend>
              {(["athlete", "coach"] as Role[]).map((item) => (
                <label className="member-checkbox" key={item}>
                  <Checkbox
                    checked={input.roles.includes(item)}
                    onCheckedChange={() => toggleRole(item)}
                  />
                  {item === "coach" ? "Coach" : "Atleta"}
                </label>
              ))}
            </fieldset>
          )}
          {canManage && (
            <label className="member-checkbox w-fit">
              <Checkbox
                checked={input.isAdmin}
                onCheckedChange={() => set("isAdmin", !input.isAdmin)}
              />
              Administrador
            </label>
          )}
          <div className="form-grid">
            <label>
              <span className="field-label">
                Nome <span className="required-mark">*</span>
                {submitted && invalid.name && (
                  <span className="error"> Campo obrigatório</span>
                )}
              </span>
              <input
                value={input.name}
                className={submitted && invalid.name ? invalidClass : undefined}
                onChange={(event) => set("name", event.target.value)}
                autoFocus
                maxLength={80}
                required
              />
            </label>
            {isAthleteProfile && (
              <label>
                <span className="field-label">
                  Número <span className="required-mark">*</span>
                  {submitted && invalid.number && (
                    <span className="error"> Campo obrigatório</span>
                  )}
                </span>
                <input
                  value={input.number}
                  className={submitted && invalid.number ? invalidClass : undefined}
                  onChange={(event) => set("number", Number(event.target.value))}
                  type="number"
                  min="0"
                  max="99"
                  required
                />
              </label>
            )}
          </div>
          <label className="photo-field">
            <span className="field-label">Foto do perfil</span>
            <span className="photo-upload">
              {input.photoUrl ? (
                <img src={input.photoUrl} alt="Prévia da foto do perfil" />
              ) : (
                "Selecionar foto"
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(event) => uploadPhoto(event.target.files?.[0])}
              />
            </span>
          </label>
          {isAthleteProfile && (
            <fieldset
              className={`selection-panel position-options ${submitted && invalid.positions ? "!border-red-500" : ""}`}
            >
              <legend>
                Posições{" "}
                <span
                  className={`required-mark ${input.positions.trim() ? "!text-[#8b949e]" : ""}`}
                >
                  *
                </span>
              </legend>
              {profilePositions.map((position) => (
                <label className="member-checkbox" key={position}>
                  <Checkbox
                    checked={input.positions.split(", ").includes(position)}
                    onCheckedChange={() => togglePosition(position)}
                  />
                  {position}
                </label>
              ))}
            </fieldset>
          )}
          <label>
            <span className="field-label">
              Unidade <span className="required-mark">*</span>
            </span>
            <select
              value={input.units}
              onChange={(event) => set("units", event.target.value)}
            >
              <option>Ataque</option>
              <option>Defesa</option>
              <option>Ataque e defesa</option>
            </select>
          </label>
          {canManage && (
            <>
              <label>
                <span className="field-label">Status</span>
                <select
                  value={input.status}
                  onChange={(event) =>
                    set("status", event.target.value as MemberStatus)
                  }
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </label>
            </>
          )}
          {error && !hasInvalid && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button className="secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="primary disabled:cursor-not-allowed disabled:border-[#3a4148] disabled:bg-[#30363c] disabled:text-[#89929a]"
              onClick={save}
              disabled={!isDirty}
            >
              Salvar perfil
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
