import Addon from "./addon";

class AddonModule {
  protected _Addon: Addon;
  constructor(parent: Addon) {
    this._Addon = parent;
    // this._createElement = this._Addon.toolkit.UI.createElement;
  }

  protected _debug(...data: any) {
    this._Addon.toolkit.Tool.log(...data);
  };
}

export default AddonModule;
