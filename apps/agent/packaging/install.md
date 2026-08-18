# LinuxPilot agent install

The agent is a local Linux process. It does not open an inbound port and does not run shell commands from the control plane.

1. Create the unprivileged user and state directory:

```bash
sudo useradd --system --home-dir /var/lib/linuxpilot --create-home --shell /usr/sbin/nologin linuxpilot
sudo chmod 700 /var/lib/linuxpilot
```

2. Install the `linuxpilot-agent` binary to `/usr/bin/linuxpilot-agent` and the unit from `linuxpilot-agent.service`.

3. Write `/etc/linuxpilot/agent.env` with `LINUXPILOT_GATEWAY_URL` only. Do not store the enrollment token there.

4. Enroll with a one-time token from stdin or a `0600` file. Do not put the token in the URL.

```bash
printf '%s' "$TOKEN" | sudo -u linuxpilot env LINUXPILOT_GATEWAY_URL=https://panel.example.com \
  linuxpilot-agent enroll --server-id "$SERVER_ID" --stdin
sudo systemctl enable --now linuxpilot-agent
```

Do not use `curl | sudo bash` as the only install method.
