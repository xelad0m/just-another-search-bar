MODULES = extension.js metadata.json stylesheet.css LICENSE README.md prefs.js schemas/
INSTALLPATH=~/.local/share/gnome-shell/extensions/just-another-search-bar@xelad0m

all: compile-settings

compile-settings:
	glib-compile-schemas --strict --targetdir=schemas/ schemas

install: all
	rm -rf $(INSTALLPATH)
	mkdir -p $(INSTALLPATH)
	cp -r $(MODULES) $(INSTALLPATH)/
	gnome-extensions enable just-another-search-bar@xelad0m

uninstall:
	gnome-extensions disable just-another-search-bar@xelad0m
	rm -rf $(INSTALLPATH)

bundle: all
	zip -r bundle.zip $(MODULES)