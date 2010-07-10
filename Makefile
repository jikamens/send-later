all: send_later3.xpi

CMD=find . \( \( -name RCS -o -name .svn \) -prune \) -o \! -name '*~' \
    \! -name '.\#*' \! -name '*,v' \! -name Makefile \! -name '*.xpi' \
    -type f -print
FILES=$(shell $(CMD))

send_later3.xpi: $(FILES)
	zip -r $@ $(FILES)

clean: ; -rm -f send_later3.xpi
