"use client";

import { useEffect, useRef, useState } from "react";

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function getDaysInMonth(month, year) {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isAtLeast18(day, month, year) {
  const parsedDay = Number(day);
  const parsedMonth = Number(month);
  const parsedYear = Number(year);
  const today = new Date();

  if (!parsedDay || !parsedMonth || !parsedYear) {
    return null;
  }

  if (
    parsedYear < 1900
    || parsedMonth < 1
    || parsedMonth > 12
    || parsedDay < 1
    || parsedDay > getDaysInMonth(parsedMonth, parsedYear)
  ) {
    return null;
  }

  const birthDate = new Date(parsedYear, parsedMonth - 1, parsedDay);
  const todayDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  if (birthDate > todayDate) {
    return null;
  }

  const adultCutoff = new Date(
    today.getFullYear() - 18,
    today.getMonth(),
    today.getDate()
  );

  return birthDate <= adultCutoff;
}

export default function AgeGateDialog({ isFading = false, onConfirmAdult, onReject }) {
  const dayInputRef = useRef(null);
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    dayInputRef.current?.focus();
  }, []);

  function handleSubmit(event) {
    event.preventDefault();

    const ageResult = isAtLeast18(day, month, year);

    if (ageResult === null) {
      setError("Enter a valid date of birth.");
      return;
    }

    if (!ageResult) {
      onReject();
      return;
    }

    onConfirmAdult();
  }

  return (
    <>
      <form
        className={`age-gate ${isFading ? "age-gate--fade" : ""}`}
        onSubmit={handleSubmit}
      >
        <label className="age-gate__label" htmlFor="age-gate-day">
          Enter your date of birth:
        </label>
        <div className="age-gate__fields">
          <input
            ref={dayInputRef}
            id="age-gate-day"
            inputMode="numeric"
            maxLength={2}
            onChange={(event) => setDay(event.target.value.replace(/\D/g, ""))}
            placeholder="dd"
            value={day}
          />
          <input
            aria-label="Month"
            inputMode="numeric"
            maxLength={2}
            onChange={(event) => setMonth(event.target.value.replace(/\D/g, ""))}
            placeholder="mm"
            value={month}
          />
          <input
            aria-label="Year"
            inputMode="numeric"
            maxLength={4}
            onChange={(event) => setYear(event.target.value.replace(/\D/g, ""))}
            placeholder="yyyy"
            value={year}
          />
        </div>
        {error ? <p className="age-gate__error">{error}</p> : null}
        <button type="submit">OK</button>
        <p className="age-gate__note">
          This data won't be collected or stored in our systems.
        </p>
      </form>
      <div>
        <br />
        <br />
        <br />
        <br />
        <br />
      </div>
    </>
  );
}
