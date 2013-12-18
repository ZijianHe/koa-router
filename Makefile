
test:
	@./node_modules/.bin/mocha \
	  --reporter spec \
	  --require should \
	  --harmony \
	  test/*/*.js \
	  test/*.js

.PHONY: test