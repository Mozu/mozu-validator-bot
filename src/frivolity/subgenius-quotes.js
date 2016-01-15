import fetch from 'node-fetch';
export default function(logger) {
  return fetch('http://colonpipe.org/dobbs.json')
  .then((x) => x.json());
}
