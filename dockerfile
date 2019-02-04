FROM node:10 as build

RUN yarn global add pkg

ADD . /app
WORKDIR /app
RUN yarn install
RUN pkg ./node_modules/@renanhangai/config-builder/bin/config-builder --targets node10-alpine-x64 --output config-builder

FROM alpine
COPY --from=build /app/config-builder /usr/local/bin/config-builder
RUN apk add --no-cache libstdc++
CMD ["/usr/local/bin/config-builder"]