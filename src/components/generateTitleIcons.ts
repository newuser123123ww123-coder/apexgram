import {getApexSetting} from '@lib/apexSettings';
import {attachClickEvent} from '@helpers/dom/clickEvent';
import {Chat, User} from '@layer';
import {i18n} from '@lib/langPack';
import apiManagerProxy from '@lib/apiManagerProxy';
import rootScope from '@lib/rootScope';
import generateApexIcon from '@components/generateApexIcon';
import {isApexUser, loadApexUsers} from '@lib/apexUsers';
import generateFakeIcon from '@components/generateFakeIcon';
import generatePremiumIcon from '@components/generatePremiumIcon';
import generateVerifiedIcon from '@components/generateVerifiedIcon';
import showPremiumPopup from '@components/popups/premium';
import showStarGiftInfoPopup from '@components/popups/starGiftInfo';
import {openEmojiStatusPicker} from '@components/sidebarLeft/emojiStatusPicker';
import {wrapAdaptiveCustomEmoji} from '@components/wrappers/customEmojiSimple';
import wrapEmojiStatus from '@components/wrappers/emojiStatus';

export default async function generateTitleIcons({
  peerId,
  noVerifiedIcon,
  noBotVerifiedIcon,
  noFakeIcon,
  noPremiumIcon,
  noDirectMessagesBadge,
  peer,
  wrapOptions,
  clickableEmojiStatus = false
}: {
  peerId: PeerId,
  wrapOptions: WrapSomethingOptions,
  noVerifiedIcon?: boolean,
  noBotVerifiedIcon?: boolean,
  noFakeIcon?: boolean,
  noPremiumIcon?: boolean,
  noDirectMessagesBadge?: boolean,
  clickableEmojiStatus?: boolean,
  peer?: Chat | User
}): Promise<{elements: HTMLElement[]; botVerification?: HTMLElement;}> {
  peer ??= apiManagerProxy.getPeer(peerId);
  const elements: HTMLElement[] = [];
  if(!peer) {
    return {elements};
  }

  if(((peer as Chat.channel).pFlags.fake || (peer as User.user).pFlags.scam) && !noFakeIcon) {
    elements.push(generateFakeIcon((peer as User.user).pFlags.scam));
  }

  if(!noPremiumIcon && wrapOptions?.middleware) {
    const emojiStatus = (peer as User.user | Chat.channel).emoji_status;
    const isPremiumFeaturesHidden = await apiManagerProxy.isPremiumFeaturesHidden();
    if(emojiStatus && 'document_id' in emojiStatus && !isPremiumFeaturesHidden) {
      const {middleware} = wrapOptions;
      const container = await wrapEmojiStatus({
        emojiStatus,
        wrapOptions
      });

      if(clickableEmojiStatus) {
        container.classList.add('clickable');
        let busy = false;
        const detach = attachClickEvent(container, async(e) => {
          e.stopPropagation();
          if(peerId === rootScope.myId) {
            openEmojiStatusPicker({
              managers: rootScope.managers,
              anchorElement: container
            });
          } else if(emojiStatus._ === 'emojiStatusCollectible') {
            if(busy) return;
            busy = true;
            const gift = await rootScope.managers.appGiftsManager.getGiftBySlug(emojiStatus.slug);
            showStarGiftInfoPopup({gift});
            busy = false;
          } else {
            showPremiumPopup({
              peerId,
              emojiStatusId: emojiStatus.document_id
            });
          }
        });

        middleware.onDestroy(detach);
      }

      if(!middleware()) return {elements};
      elements.push(container);
    } else if((peer as User.user).pFlags.premium && !isPremiumFeaturesHidden) {
      const premiumIcon = generatePremiumIcon();

      if(clickableEmojiStatus) {
        premiumIcon.classList.add('clickable');
        const detach = attachClickEvent(premiumIcon, (e) => {
          e.stopPropagation();
          showPremiumPopup({
            peerId
          });
        });

        wrapOptions.middleware.onDestroy(detach);
      }

      elements.push(premiumIcon);
    }
  }

  // CUSTOM: the ApexGram star for the users of this client
  if(!noPremiumIcon && peerId.isUser() && getApexSetting('star')) {
    await loadApexUsers();
    if(isApexUser(peerId)) {
      const apexIcon = generateApexIcon();

      // * a click on the star tells what it is (clickable in the same places as the Premium star)
      if(clickableEmojiStatus) {
        apexIcon.classList.add('clickable');
        const firstName = (peer as User.user).first_name;
        const detach = attachClickEvent(apexIcon, (e) => {
          e.stopPropagation();
          // * the window is loaded only at the click, so its code does not take part in the start of the app
          void import('@components/popups/apexInfo').then(({default: showApexInfoPopup}) => {
            showApexInfoPopup(firstName);
          }).catch((err) => {
            console.error('[apexgram] popup failed', err);
          });
        });

        wrapOptions?.middleware?.onDestroy(detach);
      }

      elements.push(apexIcon);
    }
  }

  if((peer as Chat.channel).pFlags.verified && !noVerifiedIcon) {
    elements.push(generateVerifiedIcon());
  }

  if(peer?._ === 'channel' && peer.pFlags?.monoforum && !noDirectMessagesBadge) {
    const span = document.createElement('span');
    span.append(i18n('ChannelDirectMessages.Badge'));
    span.classList.add('peer-title-direct-badge');
    elements.push(span);
  }

  let botVerification: HTMLElement;
  if((peer as User.user | Chat.channel).bot_verification_icon && !noBotVerifiedIcon) {
    const {container} = wrapAdaptiveCustomEmoji({
      docId: (peer as User.user | Chat.channel).bot_verification_icon,
      size: 24,
      wrapOptions
    })
    botVerification = container;
    container.classList.add('peer-title-bot-verification');
  }

  return {elements, botVerification};
}
