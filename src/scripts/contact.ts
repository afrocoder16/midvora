import { bases, extras, packages, bundles, money } from '../data/services';

const form = document.querySelector<HTMLFormElement>('#sample-form');
const submit = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
const label = submit?.querySelector<HTMLElement>('[data-submit-label]');
const status = document.querySelector<HTMLElement>('#form-status');
const success = document.querySelector<HTMLElement>('#contact-success');
const params = new URLSearchParams(location.search);
const packageId = params.get('package');
let selection = '';
if (packageId === 'custom' && bases.some(base => base.id === params.get('base'))) {
  const base = bases.find(base => base.id === params.get('base'))!;
  const selected = extras.filter(extra => params.getAll('extra').includes(extra.id));
  selection = [base.name, ...selected.map(extra => extra.name)].join(' + ') + ' · ' + money(base.price + selected.reduce((sum, extra) => sum + extra.price, 0)) + ' estimate';
  if (params.get('care') === 'full') selection += ' + Full Care at $50/month';
} else {
  const choice = [...packages, ...bundles].find(item => item.id === packageId);
  if (choice) selection = choice.name + ' · ' + money(choice.price);
}
if (selection) {
  const summary = document.querySelector<HTMLElement>('#request-summary');
  const summaryText = document.querySelector<HTMLElement>('#request-summary-text');
  const input = document.querySelector<HTMLInputElement>('#project-selection');
  if (summary && summaryText && input) { summary.hidden = false; summaryText.textContent = selection; input.value = selection; }
}
if (form && submit && label && status && success) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submit.disabled) return;
    const data = new FormData(form);
    if (data.get('botcheck')) return;
    submit.disabled = true;
    label.textContent = 'Sending your hello…';
    status.hidden = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ ...Object.fromEntries(data), access_key: 'e7f6edce-9410-45b7-a058-a03f661f953b', subject: 'New Free Sample Request — Midvora', from_name: data.get('businessName'), projectSelection: selection }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error('Submission failed');
      form.hidden = true;
      success.hidden = false;
      const heading = success.querySelector('h2');
      if (heading) { heading.tabIndex = -1; heading.focus(); }
    } catch {
      status.textContent = 'Your request didn’t go through. Please try again, or call (507) 530-4837.';
      status.dataset.state = 'error';
      status.hidden = false;
    } finally {
      window.clearTimeout(timeout);
      submit.disabled = false;
      label.textContent = 'Let’s make my free sample';
    }
  });
  document.querySelector('#send-another')?.addEventListener('click', () => {
    form.reset();
    const input = form.querySelector<HTMLInputElement>('#project-selection');
    if (input) input.value = selection;
    form.hidden = false;
    success.hidden = true;
    form.querySelector<HTMLInputElement>('input[name="yourName"]')?.focus();
  });
}
