## Build Local

```docker build -t live-clipboard:local d:\CodingProjects\live-clipboard```

## Run Local

```docker run --rm -d --name lc-test -p 8080:8080 -p 8443:8443 live-clipboard:local```

### Publish

``` powershell -NoProfile -ExecutionPolicy Bypass -File .\docker\docker-publish.ps1 -DockerHubUser username -Version x.x.x ```