import {
  getCustomRuleWarnings,
  validateCustomRule,
  type CustomRule,
  type CustomRuleValidationError,
  type CustomRuleWarning,
} from '@/core/storage';
import { Button, Row, TextArea, TextInput, type Theme } from '@/ui';

const VALIDATION_ERROR_LABEL: Record<CustomRuleValidationError, string> = {
  empty_id: 'Rule id is missing.',
  id_too_long: 'Id is too long.',
  empty_name: 'Name is required.',
  name_too_long: 'Name is too long.',
  empty_pattern: 'Pattern is required.',
  pattern_too_long: 'Pattern is too long.',
  invalid_pattern: 'Invalid regular expression.',
  unsafe_pattern: 'Pattern looks unsafe (nested quantifiers).',
  invalid_flags: 'Flags must use only g, i, m, s, u, or y.',
  too_many_rules: 'Too many rules.',
};

const WARNING_LABEL: Record<CustomRuleWarning, string> = {
  broad_pattern:
    'This pattern may match large portions of text and mask more than you intend. Consider anchoring it (e.g. \\b…\\b) or adding literal characters.',
};

function fieldError(rule: CustomRule, field: 'name' | 'pattern' | 'flags'): string | null {
  const error = validateCustomRule(rule).errors[field];
  return error ? VALIDATION_ERROR_LABEL[error] : null;
}

interface CustomRuleModalProps {
  t: Theme;
  mode: 'add' | 'edit';
  draft: CustomRule;
  onDraftChange: (draft: CustomRule) => void;
  onClose: () => void;
  onSubmit: () => void;
  onRemove?: () => void;
}

export function CustomRuleModal({
  t,
  mode,
  draft,
  onDraftChange,
  onClose,
  onSubmit,
  onRemove,
}: CustomRuleModalProps) {
  const canSubmit = validateCustomRule(draft).ok;
  const nameError = fieldError(draft, 'name');
  const patternError = fieldError(draft, 'pattern');
  const flagsError = fieldError(draft, 'flags');
  const warnings = getCustomRuleWarnings(draft);

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'oklch(0% 0 0 / 0.55)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-rule-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 440,
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: 14,
          boxShadow: t.popShadow,
          padding: '16px 18px',
        }}
      >
        <h2
          id="custom-rule-modal-title"
          style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: t.text }}
        >
          {mode === 'add' ? 'Add rule' : 'Edit rule'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: 11.5, color: t.textSub, marginBottom: 6 }}>
              Name
            </span>
            <TextInput
              t={t}
              value={draft.name}
              onChange={(value) => onDraftChange({ ...draft, name: value })}
            />
            {nameError && (
              <span style={{ display: 'block', marginTop: 6, fontSize: 11.5, color: t.redText }}>
                {nameError}
              </span>
            )}
          </label>

          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: 11.5, color: t.textSub, marginBottom: 6 }}>
              Pattern
            </span>
            <TextArea
              t={t}
              rows={3}
              mono
              placeholder={String.raw`\bACME-\d{4}\b`}
              value={draft.pattern}
              onChange={(value) => onDraftChange({ ...draft, pattern: value })}
            />
            {patternError && (
              <span style={{ display: 'block', marginTop: 6, fontSize: 11.5, color: t.redText }}>
                {patternError}
              </span>
            )}
            {!patternError &&
              warnings.map((warning) => (
                <span
                  key={warning}
                  style={{
                    display: 'block',
                    marginTop: 6,
                    fontSize: 11.5,
                    lineHeight: 1.45,
                    color: t.amberText,
                  }}
                >
                  {WARNING_LABEL[warning]}
                </span>
              ))}
          </label>

          <Row t={t} label="Flags" hint="Optional. g is always applied. Example: i">
            <TextInput
              t={t}
              width={72}
              value={draft.flags ?? ''}
              onChange={(value) => onDraftChange({ ...draft, flags: value || undefined })}
            />
          </Row>
          {flagsError && (
            <span style={{ fontSize: 11.5, color: t.redText, marginTop: -4 }}>{flagsError}</span>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 18,
            flexWrap: 'wrap',
          }}
        >
          {mode === 'edit' && onRemove && (
            <Button t={t} variant="danger-ghost" onClick={onRemove}>
              Remove rule
            </Button>
          )}
          <div style={{ flex: 1 }} />
          <Button t={t} variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button t={t} variant="primary" onClick={onSubmit} disabled={!canSubmit}>
            {mode === 'add' ? 'Add' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
