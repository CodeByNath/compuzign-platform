import { useState } from 'preact/hooks';
import type { ContactFormValues } from './types';

interface ContactFormProps {
  values: ContactFormValues;
  onChange: (values: ContactFormValues) => void;
  disabled?: boolean;
  submitAttempted?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactForm({ values, onChange, disabled = false, submitAttempted = false }: ContactFormProps) {
  const [touched, setTouched] = useState<Partial<Record<keyof ContactFormValues, true>>>({});

  const set = (field: keyof ContactFormValues) => (e: Event) => {
    onChange({ ...values, [field]: (e.target as HTMLInputElement | HTMLTextAreaElement).value });
  };

  const touch = (field: keyof ContactFormValues) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const contactInvalid = (!!touched.contact || submitAttempted) && !values.contact.trim();
  const emailMissing   = (!!touched.email   || submitAttempted) && !values.email;
  const emailInvalid   = (!!touched.email   || submitAttempted) && !!values.email && !EMAIL_RE.test(values.email);

  return (
    <div class="cz-rf-form">
      <label class="cz-rf-field">
        <span class="cz-rf-field__label">Company</span>
        <input
          class="cz-rf-field__input"
          type="text"
          name="company"
          value={values.company}
          onInput={set('company')}
          placeholder="Acme Corp"
          autocomplete="organization"
          disabled={disabled}
        />
      </label>

      <label class="cz-rf-field">
        <span class="cz-rf-field__label">
          Contact Name <span class="cz-rf-field__req" aria-hidden="true">*</span>
        </span>
        <input
          class={`cz-rf-field__input${contactInvalid ? ' is-invalid' : ''}`}
          type="text"
          name="contact"
          value={values.contact}
          onInput={set('contact')}
          onBlur={touch('contact')}
          placeholder="Jane Smith"
          autocomplete="name"
          required
          aria-required="true"
          aria-invalid={contactInvalid}
          disabled={disabled}
        />
        {contactInvalid && (
          <span class="cz-rf-field__error" role="alert">Please enter your name.</span>
        )}
      </label>

      <label class="cz-rf-field">
        <span class="cz-rf-field__label">
          Email <span class="cz-rf-field__req" aria-hidden="true">*</span>
        </span>
        <input
          class={`cz-rf-field__input${(emailInvalid || emailMissing) ? ' is-invalid' : ''}`}
          type="email"
          name="email"
          value={values.email}
          onInput={set('email')}
          onBlur={touch('email')}
          placeholder="jane@acme.com"
          autocomplete="email"
          required
          aria-required="true"
          aria-invalid={emailInvalid || emailMissing}
          disabled={disabled}
        />
        {emailMissing && (
          <span class="cz-rf-field__error" role="alert">Email is required.</span>
        )}
        {emailInvalid && (
          <span class="cz-rf-field__error" role="alert">Please enter a valid email address.</span>
        )}
      </label>

      <label class="cz-rf-field">
        <span class="cz-rf-field__label">Phone</span>
        <input
          class="cz-rf-field__input"
          type="tel"
          name="phone"
          value={values.phone}
          onInput={set('phone')}
          placeholder="+61 400 000 000"
          autocomplete="tel"
          disabled={disabled}
        />
      </label>

      <label class="cz-rf-field cz-rf-field--full">
        <span class="cz-rf-field__label">Notes</span>
        <textarea
          class="cz-rf-field__input cz-rf-field__textarea"
          name="notes"
          value={values.notes}
          onInput={set('notes')}
          rows={3}
          placeholder="Any additional requirements or context…"
          disabled={disabled}
        />
      </label>
    </div>
  );
}
