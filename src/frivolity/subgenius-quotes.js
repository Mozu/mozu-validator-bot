import fetch from 'node-fetch';
export default function() {
  return fetch('http://colonpipe.org/dobbs.json')
  .then((x) => s.json())
}
