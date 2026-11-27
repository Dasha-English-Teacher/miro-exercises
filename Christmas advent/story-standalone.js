// Public exercises can be practised without an account.
if (window.top === window) {
  const decision = document.querySelector('[data-story-decision]');
  const groups = [...decision.querySelectorAll('[data-story-prediction], [data-story-options]')];
  const choices = new Map();
  const button = decision.querySelector('[data-story-confirm]');
  const status = decision.querySelector('[data-story-status]');
  status.textContent = 'Open this exercise in your program to save your choices to your account.';

  decision.addEventListener('click', (event) => {
    const option = event.target.closest('[data-story-option]');
    if (!option) return;
    const group = option.closest('[data-story-prediction], [data-story-options]');
    choices.set(group, option);
    if (option.type !== 'radio') {
      group.querySelectorAll('[data-story-option]').forEach((item) => {
        item.classList.toggle('selected', item === option);
        item.classList.toggle('is-selected', item === option);
        item.setAttribute('aria-pressed', String(item === option));
      });
    }
    button.disabled = groups.some((item) => !choices.has(item));
  });
  button.addEventListener('click', () => {
    const option = choices.get(decision.querySelector('[data-story-options]'));
    if (option?.dataset.standaloneDestination) {
      location.href = option.dataset.standaloneDestination;
    } else {
      status.textContent = 'The next chapter is coming soon!';
    }
  });
}
