document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.testForm').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const params = new URLSearchParams(new FormData(form)).toString();

      fetch('/api/stock-prices?' + params, {
        method: 'GET'
      })
        .then((response) => {
          if (response.ok) {
            return response.json();
          } else {
            throw new Error('Request failed');
          }
        })
        .then((data) => {
          document.querySelector('#jsonResult').textContent = JSON.stringify(data);
        })
        .catch((error) => {
          console.error(error);
        });
    });
  });
});
