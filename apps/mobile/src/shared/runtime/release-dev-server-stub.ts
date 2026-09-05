export default function getDevServer(): {
  readonly bundleLoadedFromServer: false;
  readonly fullBundleUrl: null;
  readonly url: "";
} {
  return {
    bundleLoadedFromServer: false,
    fullBundleUrl: null,
    url: "",
  };
}
