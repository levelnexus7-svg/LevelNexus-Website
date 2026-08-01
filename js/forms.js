/*! Level Nexus — forms.js
 *  Client-side validation for the enquiry form.
 *
 *  There is no backend yet. The form is wired so that adding one is a
 *  one-line change: point ENDPOINT at your handler (Formspree, Netlify
 *  Forms, a Lambda, whatever) and submit() will POST the payload as JSON.
 *  Until then it falls back to opening a pre-filled WhatsApp message, so
 *  no enquiry is ever lost.
 */
window.LN = window.LN || {};

window.LN.forms = (function () {
  'use strict';

  var u = window.LN.util;

  /** Set this to your form handler URL to go live. */
  var ENDPOINT = '';

  var RULES = {
    name:    { required: true,  min: 2,  label: 'your name' },
    email:   { required: true,  email: true, label: 'a valid email address' },
    phone:   { required: false, min: 6,  label: 'a contactable number' },
    company: { required: false },
    interest:{ required: true,  label: 'what you need' },
    message: { required: true,  min: 10, label: 'a short message' }
  };

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function fieldOf(input) {
    return input.closest('.field');
  }

  function setError(input, message) {
    var field = fieldOf(input);
    if (!field) return;

    var box = field.querySelector('.field__error');
    field.classList.add('field--invalid');
    input.setAttribute('aria-invalid', 'true');
    if (box) box.textContent = message;
  }

  function clearError(input) {
    var field = fieldOf(input);
    if (!field) return;
    field.classList.remove('field--invalid');
    input.removeAttribute('aria-invalid');
  }

  function validateField(input) {
    var rule = RULES[input.name];
    if (!rule) return true;

    var value = (input.value || '').trim();

    if (rule.required && !value) {
      setError(input, 'Please enter ' + (rule.label || 'this field') + '.');
      return false;
    }

    if (value && rule.email && !EMAIL_RE.test(value)) {
      setError(input, 'That email address does not look right.');
      return false;
    }

    if (value && rule.min && value.length < rule.min) {
      setError(input, 'Please enter ' + (rule.label || 'a little more detail') + '.');
      return false;
    }

    clearError(input);
    return true;
  }

  function collect(form) {
    var payload = {};
    new FormData(form).forEach(function (v, k) {
      if (k !== '_hp') payload[k] = typeof v === 'string' ? v.trim() : v;
    });
    payload.submittedAt = new Date().toISOString();
    payload.source = window.location.pathname;
    return payload;
  }

  function status(box, message, isError) {
    if (!box) return;
    box.textContent = message;
    box.classList.add('is-visible');
    box.classList.toggle('form-status--error', !!isError);
  }

  /** Turn the enquiry into a readable WhatsApp message. */
  function whatsappFallback(payload) {
    var lines = [
      'New enquiry from levelnexus.co.za',
      '',
      'Name: ' + (payload.name || '—'),
      'Email: ' + (payload.email || '—'),
      'Phone: ' + (payload.phone || '—'),
      'Organisation: ' + (payload.company || '—'),
      'Interest: ' + (payload.interest || '—'),
      '',
      payload.message || ''
    ];
    return u.waLink(lines.join('\n'));
  }

  function init() {
    var form = u.$('#enquiry-form');
    if (!form) return;

    var box = u.$('#form-status');
    var submitBtn = form.querySelector('[type="submit"]');
    var inputs = u.$$('input, select, textarea', form).filter(function (i) {
      return i.name && i.name !== '_hp';
    });

    // Validate on blur once the visitor has actually left a field.
    inputs.forEach(function (input) {
      input.addEventListener('blur', function () { validateField(input); });
      input.addEventListener('input', function () {
        if (fieldOf(input) && fieldOf(input).classList.contains('field--invalid')) {
          validateField(input);
        }
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Honeypot: a bot fills every field it finds.
      if (form.elements._hp && form.elements._hp.value) return;

      var firstBad = null;
      inputs.forEach(function (input) {
        if (!validateField(input) && !firstBad) firstBad = input;
      });

      if (firstBad) {
        status(box, 'Please check the highlighted fields and try again.', true);
        firstBad.focus();
        return;
      }

      var payload = collect(form);

      if (!ENDPOINT) {
        // No backend configured — hand off to WhatsApp with everything filled in.
        status(box, 'Opening WhatsApp with your enquiry ready to send. ' +
                    'You can also email ' + window.LN.config.email + ' directly.');
        window.open(whatsappFallback(payload), '_blank', 'noopener');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Request failed: ' + res.status);
          form.reset();
          status(box, 'Thanks — your enquiry is in. We reply within one working day.');
        })
        .catch(function () {
          status(box, 'That did not send. Please WhatsApp us on ' +
                      window.LN.config.phoneDisplay + ' or email ' +
                      window.LN.config.email + '.', true);
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send enquiry';
        });
    });
  }

  return { init: init };
})();
