/**
 * CUSTOM: the window that opens after a click on the ApexGram star next to a name.
 */
import showPeerPopup from '@components/popups/peer';
import appImManager from '@lib/appImManager';

const SUPPORT_USERNAME = 'LeshaPavlov1';
const CHANNEL_USERNAME = 'apexgramO';

export default function showApexInfoPopup(firstName?: string) {
  const links: HTMLAnchorElement[] = [];

  const makeLine = (...nodes: (string | Node)[]) => {
    const line = document.createElement('p');
    line.classList.add('popup-description');
    line.append(...nodes);
    return line;
  };

  const makeLink = (username: string) => {
    const link = document.createElement('a');
    link.href = `https://t.me/${username}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = '@' + username;
    link.dataset.username = username;
    links.push(link);
    return link;
  };

  const content = document.createElement('div');
  content.classList.add('apex-info');
  content.append(
    makeLine('Связаться с нами:'),
    makeLine('Поддержка ', makeLink(SUPPORT_USERNAME)),
    makeLine('Официальный канал ', makeLink(CHANNEL_USERNAME))
  );

  // * the name comes from another person, so it is only ever put in as plain text
  const name = (firstName || '').trim();
  const popup = showPeerPopup('popup-apex-info', {
    title: name ? `Пользователь ${name} использует ApexGram` : 'Пользователь использует ApexGram',
    content,
    buttons: [{langKey: 'OK', isCancel: true}]
  });

  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      // * open it inside of the app, not in a new tab
      e.preventDefault();
      popup.hide();
      appImManager.openUsername({userName: link.dataset.username});
    });
  });
}
