NAME = just-another-search-bar
LANG = ru

all: install

schemas:
	glib-compile-schemas --strict --targetdir=schemas/ schemas

gettext:
	mkdir -p po
	xgettext --from-code=UTF-8 --output=po/$(LANG).po *.js

bundle:
	gnome-extensions pack --force --podir=po .

install: uninstall bundle
	gnome-extensions install --force $(NAME)@xelad0m.shell-extension.zip

uninstall:
	gnome-extensions uninstall $(NAME)@xelad0m || (echo "not installed")

.PHONY: all schemas gettext bundle install uninstall 