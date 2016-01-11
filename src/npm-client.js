import fetch from 'node-fetch';
import { Observable } from 'rx';
export default function NpmClient({ npm }) {
  return {
    getStatus(packageName) {
      return Observable.fromPromise(
        fetch(npm.registry + packageName)
        .then((res) => res.json())
        .catch(() => false)
      );
    }
  };
}
