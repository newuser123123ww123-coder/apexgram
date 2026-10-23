/** CUSTOM: the ApexGram star, which is shown next to the name of a user of this client. */
export default function generateApexIcon() {
  const span = document.createElement('span');
  span.classList.add('apex-icon');
  span.title = 'ApexGram';
  return span;
}
