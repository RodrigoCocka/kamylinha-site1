(() => {
  const form = document.querySelector('#checkout-form');
  const generate = document.querySelector('#generate');
  const error = document.querySelector('#error');
  const result = document.querySelector('#pix-result');
  const isLocalHost = ['localhost', '127.0.0.1'].includes(location.hostname);
  const testMode = isLocalHost && new URLSearchParams(location.search).get('teste_fluxo') === '1';
  let pollTimer;

  if (testMode) {
    document.querySelector('#test-banner').hidden = false;
    document.querySelector('.brand')?.replaceWith(Object.assign(document.createElement('span'), { textContent: 'TESTE LOCAL' }));
    document.querySelector('.creator').textContent = 'FLUXO DE TESTE';
    document.querySelector('.secure').textContent = 'Sem cobrança';
    document.querySelector('.checkout-content h1').textContent = 'Teste de redirecionamento';
    document.querySelector('.description').textContent = 'Preencha os campos e simule a confirmação para verificar a navegação até o Mini Site 2.';
    document.querySelector('.transparency').textContent = 'Este teste não cria Pix, não envia seus dados e não cobra nenhum valor.';
    document.querySelector('.amount span').textContent = 'Pagamento';
    document.querySelector('.amount strong').textContent = 'SIMULADO';
    document.querySelector('.footnote').textContent = 'Simulação local • Nenhuma chamada à SyncPay será feita.';
    generate.textContent = 'Simular Pix aprovado';
  }

  document.querySelector('#copy-pix').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    try {
      await navigator.clipboard.writeText(document.querySelector('#pix-code').value);
      button.textContent = 'Copiado!';
      setTimeout(() => { button.textContent = 'Copiar'; }, 1800);
    } catch {
      document.querySelector('#pix-code').select();
      document.execCommand('copy');
      button.textContent = 'Copiado!';
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.textContent = '';
    if (testMode) {
      generate.disabled = true;
      generate.textContent = 'Simulando confirmação…';
      window.setTimeout(() => { window.location.assign('/site2-teste/'); }, 700);
      return;
    }
    generate.disabled = true;
    generate.textContent = 'Gerando Pix…';
    try {
      const response = await fetch('/api/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'apoio_privacidade', name: form.elements.name.value, email: form.elements.email.value }),
      });
      const data = await response.json();
      if (!response.ok || !data.pix_code || !data.identifier) throw new Error(data.error || 'Não foi possível gerar o Pix. Tente novamente.');
      document.querySelector('#qr').src = data.qr_code_base64;
      document.querySelector('#pix-code').value = data.pix_code;
      result.hidden = false;
      pollTimer = setInterval(() => checkPayment(data.identifier), 5000);
    } catch (err) {
      error.textContent = err.message || 'Falha de conexão. Tente novamente.';
    } finally {
      generate.disabled = false;
      generate.textContent = 'Gerar Pix';
    }
  });

  async function checkPayment(identifier) {
    try {
      const response = await fetch(`/api/payment-status?identifier=${encodeURIComponent(identifier)}`);
      const data = await response.json();
      if (data.status === 'paid') {
        clearInterval(pollTimer);
        document.querySelector('#payment-status').textContent = 'Pagamento confirmado. Obrigada!';
      } else if (data.status === 'failed') {
        clearInterval(pollTimer);
        document.querySelector('#payment-status').textContent = 'Pix expirado ou não concluído. Gere outro pagamento.';
      }
    } catch { /* A próxima consulta tenta novamente. */ }
  }
})();
