all: send_later3.xpi

CMD=find . \( \( -name RCS -o -name .svn \) -prune \) -o \! -name '*~' \
    \! -name '.\#*' \! -name '*,v' \! -name Makefile \! -name '*.xpi' \
    \! -name '\#*' \! -name '*.pl' -type f -print
FILES=$(shell $(CMD))

send_later3.xpi: $(FILES)
	./check-locales.pl
	rm -f $@.tmp
	zip -r $@.tmp $(FILES)
	mv $@.tmp $@

clean: ; -rm -f send_later3.xpi
