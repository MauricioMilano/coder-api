#!/usr/bin/env node

/**
 * Test script for the MCP server
 * This script demonstrates how to connect to and test the MCP server
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function testMcpServer() {
  console.log('🚀 Testing MCP Server...\n');

  const client = new Client({
    name: 'test-client',
    version: '1.0.0'
  });

  try {
    // Connect to the MCP server
    const transport = new StreamableHTTPClientTransport(new URL('http://localhost:3007/mcp'));
    await client.connect(transport);

    console.log('✅ Connected to MCP server');

    // Test 1: List available tools
    console.log('\n📚 Available Tools:');
    const tools = await client.listTools();
    tools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });

    // Test 2: List available resources
    console.log('\n📂 Available Resources:');
    const resources = await client.listResources();
    resources.resources.forEach(resource => {
      console.log(`  - ${resource.name}: ${resource.description}`);
    });

    // Test 3: List available prompts
    console.log('\n💬 Available Prompts:');
    const prompts = await client.listPrompts();
    prompts.prompts.forEach(prompt => {
      console.log(`  - ${prompt.name}: ${prompt.description}`);
    });

    // Test 4: Read projects resource
    console.log('\n📋 Reading projects list...');
    try {
      const projectsResource = await client.readResource({
        uri: 'projects://list'
      });
      console.log('Projects:', projectsResource.contents[0].text);
    } catch (error) {
      console.log('No projects found or error reading projects');
    }

    console.log('\n✅ MCP Server test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await client.close();
  }
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testMcpServer().catch(console.error);
}

export { testMcpServer };