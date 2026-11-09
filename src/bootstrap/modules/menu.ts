import { config, name as packageName } from '../../../package.json';

type Target = _ZoteroTypes.MenuManager.ValidTarget;
type MenuData<T extends Target> = _ZoteroTypes.MenuManager.MenuOptions<T>['menus'][number];

/** 已注册的菜单ID，卸载时注销 */
const registeredMenuIDs: string[] = [];

/**
 * 通过Zotero原生MenuManager注册菜单（每个目标只需注册一次，对所有主窗口生效）
 * @param id 在插件内唯一的菜单ID
 */
export function registerMenu<T extends Target>(id: string, target: T, menus: MenuData<T>[]) {
    const menuID = Zotero.MenuManager.registerMenu({
        menuID: `${config.addonName}-${id}`,
        pluginID: config.addonID,
        target,
        menus,
    });
    if (menuID) registeredMenuIDs.push(menuID);
    else addon.log(`Failed to register menu ${id} for ${target}`);
    return menuID;
}

export function unregisterMenus() {
    registeredMenuIDs.splice(0).forEach(id => Zotero.MenuManager.unregisterMenu(id));
}

/**
 * Fluent消息ID（构建时scaffold会给ftl中的消息加上包名前缀）
 */
export function l10nID(message: string) {
    return `${packageName}-${message}`;
}

/**
 * 不需要本地化的纯文本菜单项（仅用于调试菜单）
 */
export function plainMenuItem<C>(
    label: string,
    onCommand: (event: Event, context: C) => void,
    icon?: string,
): _ZoteroTypes.MenuManager.MenuData<C> {
    return {
        menuType: 'menuitem',
        l10nID: l10nID('menuLabel'),
        // Zotero要求l10nArgs为JSON字符串（对象写法已弃用），但zotero-types仍声明为object
        l10nArgs: JSON.stringify({ label }) as unknown as object,
        icon,
        onCommand,
    };
}
