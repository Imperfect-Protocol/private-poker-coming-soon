"use client";

import { useState } from "react";

const RECIPIENT = "imperfect-protocol@protonmail.com";

const initialValues = {
  email: "",
  message: "",
  name: "",
  wallet: ""
};

function validate(values) {
  const errors = {};
  const emailParts = values.email.split("@");
  const walletBody = values.wallet.slice(2);

  if (values.name.length > 100) {
    errors.name = "Player name must be 100 characters or less.";
  }

  if (values.email.length > 100 || emailParts.length !== 2) {
    errors.email = "Email address must contain a single @ and be 100 characters or less.";
  }

  if (
    values.wallet.length !== 42
    || !values.wallet.startsWith("0x")
    || !/^[0-9a-fA-F]+$/.test(walletBody)
  ) {
    errors.wallet = "Wallet address must be exactly 42 characters, start with 0x, and use only hexadecimal values.";
  }

  if (values.message.length > 600) {
    errors.message = "Message must be 600 characters or less.";
  }

  return errors;
}

export default function JoinForm() {
  const [values, setValues] = useState(initialValues);
  const [reviewValues, setReviewValues] = useState(null);
  const [errors, setErrors] = useState({});

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({
      ...current,
      [name]: value
    }));
    setErrors((current) => ({
      ...current,
      [name]: undefined
    }));
  }

  function normalizedValues() {
    return {
      email: values.email.trim(),
      message: values.message.trim(),
      name: values.name.trim(),
      wallet: values.wallet.trim()
    };
  }

  function openEmail(nextValues) {
    const subject = `Private Poker Membership for ${nextValues.name}`;
    const body = [
      `Name: ${nextValues.name}`,
      `E-Mail: ${nextValues.email}`,
      `Wallet Address: ${nextValues.wallet}`,
      "",
      "Message",
      "=======",
      nextValues.message
    ].join("\n");

    window.location.href = `mailto:${RECIPIENT}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function handleSubmit(event) {
    event.preventDefault();

    const nextValues = normalizedValues();
    const nextErrors = validate(nextValues);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setValues(nextValues);
    setReviewValues(nextValues);
  }

  if (reviewValues) {
    return (
      <div className="join-review">
        <div className="join-review__rows">
          <section>
            <span>Player name</span>
            <p>{reviewValues.name}</p>
          </section>
          <section>
            <span>Email address</span>
            <p>{reviewValues.email}</p>
          </section>
          <section>
            <span>Wallet address</span>
            <p>{reviewValues.wallet}</p>
          </section>
          <section>
            <span>Message</span>
            <p>{reviewValues.message}</p>
          </section>
        </div>
        <div className="join-review__actions">
          <button type="button" onClick={() => setReviewValues(null)}>
            Back
          </button>
          <button type="button" onClick={() => openEmail(reviewValues)}>
            Send Email
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="join-form" onSubmit={handleSubmit} noValidate>
      <label>
        <span>Player name</span>
        <input
          name="name"
          type="text"
          value={values.name}
          maxLength={101}
          placeholder="Your player name"
          aria-invalid={Boolean(errors.name)}
          onChange={handleChange}
        />
        {errors.name ? <small className="join-field-error">{errors.name}</small> : null}
      </label>

      <label>
        <span>Email address</span>
        <input
          name="email"
          type="email"
          value={values.email}
          maxLength={101}
          placeholder="player@example.com"
          aria-invalid={Boolean(errors.email)}
          onChange={handleChange}
        />
        {errors.email ? <small className="join-field-error">{errors.email}</small> : null}
      </label>

      <label>
        <span>Wallet address</span>
        <input
          name="wallet"
          type="text"
          value={values.wallet}
          maxLength={43}
          placeholder="0x..."
          aria-invalid={Boolean(errors.wallet)}
          onChange={handleChange}
        />
        {errors.wallet ? <small className="join-field-error">{errors.wallet}</small> : null}
      </label>

      <label>
        <span>Message</span>
        <textarea
          name="message"
          rows={6}
          value={values.message}
          maxLength={601}
          placeholder="Tell us about your poker experience, and what you would like to get out of Private Poker..."
          aria-invalid={Boolean(errors.message)}
          onChange={handleChange}
        />
        {errors.message ? <small className="join-field-error">{errors.message}</small> : null}
      </label>

      <button type="submit">Next</button>
    </form>
  );
}
