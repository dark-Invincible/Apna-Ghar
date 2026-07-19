const dialog = document.querySelector('#action-dialog');
const content = document.querySelector('#dialog-content');
const toast = document.querySelector('.toast');

const dialogs = {
  verify: {
    title: 'Start a land-record match',
    text: 'Enter the available plot identifier. The production integration will return a record match and a clear document checklist — not a title guarantee.',
    label: 'Khasra, Khata, or survey number',
    placeholder: 'Example: 142/3A',
    button: 'Check details'
  },
  design: {
    title: 'Create your home concept',
    text: 'Tell us what you want to build. In Stage 4, this will create an editable AI concept for your selected plot.',
    label: 'Describe your ideal home',
    placeholder: 'A light-filled, two-storey family home with a courtyard and garden…',
    button: 'Generate concept',
    textarea: true
  },
  valuation: {
    title: 'Value estimate coming next',
    text: 'The current range combines preliminary locality signals with plot characteristics. Stage 5 will add comparable-sales, construction costs, and confidence scoring.',
    button: 'Got it'
  },
  terrain: {
    title: 'Terrain report',
    text: 'This selected plot shows a gentle average slope of 3.2°. A site survey and architect review are still required before design or construction.',
    button: 'Got it'
  },
  'new-project': {
    title: 'Start a new project',
    text: 'Add a location first. The next screen in Stage 2 will connect this to real map search and terrain data.',
    label: 'Project location',
    placeholder: 'City, locality, or plot address',
    button: 'Create project'
  }
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 3200);
}

function openDialog(key) {
  const item = dialogs[key];
  if (!item) return;
  const field = item.label ? `<label>${item.label}${item.textarea ? `<textarea placeholder="${item.placeholder}"></textarea>` : `<input placeholder="${item.placeholder}" />`}</label>` : '';
  content.innerHTML = `<form class="dialog-form" method="dialog"><p class="eyebrow">APNA GHAR · STAGE 1</p><h2>${item.title}</h2><p>${item.text}</p>${field}<div class="dialog-note">Prototype mode: no personal details are saved yet.</div><button class="primary-button" value="submit">${item.button}</button></form>`;
  dialog.showModal();
  content.querySelector('input, textarea')?.focus();
}

document.querySelectorAll('[data-action]').forEach(button => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;
    if (action === 'share') return showToast('A shareable project link will be available in Stage 6.');
    if (action === 'invite') return showToast('Expert invitations are planned for Stage 6.');
    if (action === 'profile') return showToast('Profile settings will be added with login in Stage 7.');
    if (action === 'view-land') return showToast('Land details expand into the Stage 2 land-discovery workspace.');
    openDialog(action);
  });
});

document.querySelectorAll('[data-target]').forEach(step => step.addEventListener('click', () => document.querySelector(`#${step.dataset.target}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })));
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => { if (dialog.returnValue === 'submit') showToast('Saved for the next implementation stage.'); });
document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', () => { document.querySelectorAll('.nav-link').forEach(item => item.classList.remove('active')); link.classList.add('active'); }));
