/* Roda no <head>, antes de qualquer desenho (por isso é um arquivo à parte: a política de segurança não aceita script dentro da página).
   Sem sessão guardada neste aparelho, a tela de entrada vai aparecer por cima do app. Marcar isso já aqui impede o navegador de montar
   o app escondido e de baixar as fontes dele, que disputavam banda com o que a tela de entrada precisa (ng-nuvem.css esconde o app
   enquanto a classe existir; ng-nuvem.js tira a classe quando a pessoa entra). Com sessão guardada nada muda: o app aparece como sempre.
   A chave abaixo é a mesma que ng-nuvem.js lê em lerSessao(). */
(function () {
  try {
    var d = document.documentElement, ls = window.localStorage;
    if (location.hostname === 'localhost' && ls.getItem('ng_dev_semnuvem') === '1') return;   // chave de teste (mesma condição de ng-nuvem.js)
    if (ls.getItem('sb-gjoxrgnkwmjvcfiywtcs-auth-token')) return;                              // já tem sessão (mesmo vencida: o app abre com os dados do aparelho)
    if (/[?&#](code|access_token|error)=/.test(location.search + location.hash)) return;       // voltando do link do e-mail: a sessão sai logo em seguida
    d.classList.add('ng-sem-sessao');
    setTimeout(function () { if (!document.querySelector('.ng-login')) d.classList.remove('ng-sem-sessao'); }, 8000);   // rede lenta ou script bloqueado: nunca deixa a tela em branco
  } catch (e) { }
})();
