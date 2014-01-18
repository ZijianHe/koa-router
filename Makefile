
test:
	@./node_modules/.bin/mocha \
	  --reporter spec \
	  --require should \
	  --harmony \
	  --recursive \
	  test

.PHONY: test
