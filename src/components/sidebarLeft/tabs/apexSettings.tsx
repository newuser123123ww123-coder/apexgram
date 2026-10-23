import {createSignal, For, onMount} from 'solid-js';
import CheckboxFieldTsx from '@components/checkboxFieldTsx';
import Row from '@components/rowTsx';
import Section from '@components/section';
import {useSuperTab} from '@components/solidJsTabs/superTabProvider';
import rootScope from '@lib/rootScope';
import {ApexSettingKey, getApexSetting, setApexSetting} from '@lib/apexSettings';

// CUSTOM: the "ApexGram" tab of the settings, which turns the added features on and off.
const FEATURES: {key: ApexSettingKey, title: string, description: string}[] = [
  {
    key: 'keepDeleted',
    title: 'Сохранять удалённые сообщения',
    description: 'Сообщения, которые удалили другие, остаются в чате полупрозрачными с красной корзиной. Касается только новых удалений.'
  },
  {
    key: 'readButtons',
    title: 'Кнопки «Прочитать»',
    description: 'Кнопки Все / Каналы / Группы под поиском чатов.'
  },
  {
    key: 'wallpaper',
    title: 'Свои обои из фото',
    description: 'Пункт «Установить как обои» в меню фото и показ выбранного фото вместо обоев.'
  },
  {
    key: 'star',
    title: 'Звезда ApexGram',
    description: 'Звезда рядом с именами пользователей этого клиента. После выключения или включения лучше перезагрузить страницу.'
  },
  {
    key: 'emptyLogo',
    title: 'Логотип на пустом экране',
    description: 'Логотип ApexGram и благодарность, пока не выбран чат.'
  }
];

const ApexSettingsTab = () => {
  const [tab] = useSuperTab();

  onMount(() => {
    tab.title.replaceChildren('ApexGram');
  });

  const [values, setValues] = createSignal<Record<string, boolean>>(
    Object.fromEntries(FEATURES.map((item) => [item.key, getApexSetting(item.key)]))
  );

  const onChange = (key: ApexSettingKey, value: boolean) => {
    setValues({...values(), [key]: value});
    setApexSetting(key, value, (all) => rootScope.managers.appMessagesManager.setApexSettings(all));
  };

  return (
    <Section>
      <For each={FEATURES}>
        {(item) => (
          <Row>
            <Row.CheckboxFieldToggle>
              <CheckboxFieldTsx
                checked={values()[item.key]}
                onChange={(value) => onChange(item.key, value)}
                toggle
              />
            </Row.CheckboxFieldToggle>
            <Row.Title>{item.title}</Row.Title>
            <Row.Subtitle>{item.description}</Row.Subtitle>
          </Row>
        )}
      </For>
    </Section>
  );
};

export default ApexSettingsTab;
