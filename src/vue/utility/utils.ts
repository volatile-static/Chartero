import type { AttachmentHistory } from 'zotero-reading-history';

export function getTitle(his: AttachmentHistory) {
    const Items = toolkit.getGlobal('Zotero').Items,
        item = Items.getByLibraryAndKey(his.note.libraryID, his.key);
    return item
        ? ((item as Zotero.Item).getField('title') as string)
        : undefined;
}
