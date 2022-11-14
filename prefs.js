// -*- mode: js2; indent-tabs-mode: nil; js2-basic-offset: 4 -*-
/* exported init buildPrefsWidget */

const { Gio, GObject, Gtk } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;

function init() {}

const CMD_NAMES = [
    'google', 
    'yandex', 
    'baidu', 
    'recoll',
]

const SearchPrefsWidget = GObject.registerClass(
class SearchPrefsWidget extends Gtk.Box {
    _init() {
        super._init({
            halign: Gtk.Align.CENTER,
        });

        this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.just-another-search-bar');
        let current = this._settings.get_enum('command-name');

        this.radioGroup = [];

        CMD_NAMES.forEach((name, idx) => {
            if (idx == 0) {
                this.radioGroup.push(new Gtk.CheckButton({label: name, active: idx == current}));
            } else {
                this.radioGroup.push(new Gtk.CheckButton({label: name, active: idx == current, group: this.radioGroup[0]}));
            }

            this.radioGroup[idx].connect("toggled", this._getValue.bind(this));

            this.append(this.radioGroup[idx]);
        });
    }

    _getValue() {
        this.radioGroup.forEach((radio, idx) => {
            if (radio.get_active())
                this._settings.set_enum('command-name', idx);
        });
    }
});

function buildPrefsWidget() {
    return new SearchPrefsWidget();
}